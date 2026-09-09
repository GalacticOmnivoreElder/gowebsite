// @ts-check

import crypto from "crypto";
import { adminDb } from "@/lib/firebase-admin";

export function isJiraSupportConfigured() {
  return Boolean(process.env.JIRA_BASE_URL && process.env.JIRA_EMAIL && process.env.JIRA_API_TOKEN && process.env.JIRA_PROJECT_KEY);
}

function jiraHeaders() {
  const basic = Buffer.from(`${process.env.JIRA_EMAIL}:${process.env.JIRA_API_TOKEN}`).toString("base64");
  return { Authorization: `Basic ${basic}`, Accept: "application/json", "Content-Type": "application/json" };
}

function jiraUrl(path) {
  return `${String(process.env.JIRA_BASE_URL || "").replace(/\/$/, "")}${path}`;
}

function jiraRequest(options = {}) {
  return { ...options, signal: AbortSignal.timeout(8000) };
}

function document(text) {
  return { type: "doc", version: 1, content: [{ type: "paragraph", content: [{ type: "text", text: String(text || "") }] }] };
}

export async function syncSupportRequestToJira(ticketId, { db = adminDb } = {}) {
  const ref = db.collection("support_requests").doc(ticketId);
  if (!isJiraSupportConfigured()) {
    await ref.update({ jiraSyncStatus: "not_configured", jiraSyncError: null });
    return { configured: false };
  }
  const claimed = await db.runTransaction(async (transaction) => {
    const doc = await transaction.get(ref);
    if (!doc.exists) return null;
    const data = doc.data();
    const leaseUntil = data.jiraSyncLeaseUntil?.toDate?.() || (data.jiraSyncLeaseUntil ? new Date(data.jiraSyncLeaseUntil) : null);
    if (data.jiraSyncStatus === "syncing" && leaseUntil && leaseUntil > new Date()) return null;
    if (Number(data.jiraLastSyncedVersion || 0) >= Number(data.jiraSyncVersion || 1)) return null;
    transaction.update(ref, { jiraSyncStatus: "syncing", jiraSyncError: null, jiraSyncLeaseUntil: new Date(Date.now() + 5 * 60 * 1000) });
    return { ...data, id: doc.id };
  });
  if (!claimed) return { skipped: true };

  try {
    const syncVersion = Number(claimed.jiraSyncVersion || 1);
    const syncMarker = `[GO_SYNC_VERSION:${syncVersion}]`;
    const issueLabel = `go-support-${ticketId.replace(/[^a-zA-Z0-9-]/g, "").slice(0, 48)}`;
    let issueKey = claimed.jiraIssueKey || null;
    const messages = await db.collection("support_request_messages").where("ticketId", "==", ticketId).orderBy("createdAt", "asc").get();
    const newest = messages.docs[messages.docs.length - 1]?.data();
    if (!issueKey) {
      const jql = `project = "${process.env.JIRA_PROJECT_KEY}" AND labels = "${issueLabel}"`;
      const lookup = await fetch(jiraUrl(`/rest/api/3/search/jql?maxResults=1&fields=key&jql=${encodeURIComponent(jql)}`), jiraRequest({ headers: jiraHeaders() }));
      if (lookup.ok) issueKey = (await lookup.json().catch(() => ({})))?.issues?.[0]?.key || null;
    }
    if (!issueKey) {
      const response = await fetch(jiraUrl("/rest/api/3/issue"), jiraRequest({ method: "POST", headers: jiraHeaders(), body: JSON.stringify({ fields: { project: { key: process.env.JIRA_PROJECT_KEY }, issuetype: { name: process.env.JIRA_ISSUE_TYPE || "Task" }, summary: `[GO Support] ${claimed.subject}`, description: document(`${newest?.body || claimed.subject}\n\n${syncMarker}`), labels: ["go-support", claimed.category, issueLabel] } }) }));
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.key) throw new Error(result?.errorMessages?.join("; ") || `Jira create failed (${response.status})`);
      issueKey = result.key;
    } else if (newest?.body) {
      const commentsResponse = await fetch(jiraUrl(`/rest/api/3/issue/${encodeURIComponent(issueKey)}/comment?maxResults=100&orderBy=-created`), jiraRequest({ headers: jiraHeaders() }));
      const comments = commentsResponse.ok ? (await commentsResponse.json().catch(() => ({}))).comments || [] : [];
      if (!comments.some((comment) => JSON.stringify(comment.body || {}).includes(syncMarker))) {
        const response = await fetch(jiraUrl(`/rest/api/3/issue/${encodeURIComponent(issueKey)}/comment`), jiraRequest({ method: "POST", headers: jiraHeaders(), body: JSON.stringify({ body: document(`${newest.body}\n\n${syncMarker}`) }) }));
        if (!response.ok) throw new Error(`Jira comment failed (${response.status})`);
      }
    }
    await ref.update({ jiraIssueKey: issueKey, jiraSyncStatus: "synced", jiraLastSyncedVersion: syncVersion, jiraSyncedAt: new Date(), jiraSyncError: null, jiraSyncLeaseUntil: null });
    return { configured: true, issueKey };
  } catch (error) {
    await ref.update({ jiraSyncStatus: "failed", jiraSyncError: String(error.message || "jira_sync_failed").slice(0, 500), jiraSyncFailedAt: new Date(), jiraSyncLeaseUntil: null });
    return { configured: true, failed: true };
  }
}

export function verifyJiraWebhook(rawBody, signature) {
  const secret = process.env.JIRA_WEBHOOK_SECRET;
  if (!secret || !signature) return false;
  const expected = `sha256=${crypto.createHmac("sha256", secret).update(rawBody).digest("hex")}`;
  return signature.length === expected.length && crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

export function jiraWebhookEventId(rawBody, providedId) {
  return crypto.createHash("sha256").update(`${providedId || "jira"}:${rawBody}`).digest("hex");
}

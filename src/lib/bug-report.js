import { createHmac } from "node:crypto";
import { adminDb } from "@/lib/firebase-admin";

const WINDOW_MS = 60 * 60 * 1000;
const MAX_FILE_BYTES = 3 * 1024 * 1024;
export const BUG_REPORT_MAX_FILE_BYTES = MAX_FILE_BYTES;

function config() {
  const { JIRA_BUG_CLOUD_ID, JIRA_BUG_API_TOKEN, JIRA_BUG_RATE_LIMIT_SECRET } = process.env;
  if (!JIRA_BUG_CLOUD_ID || !JIRA_BUG_API_TOKEN || !JIRA_BUG_RATE_LIMIT_SECRET) return null;
  if (!/^[a-f0-9-]{36}$/i.test(JIRA_BUG_CLOUD_ID)) return null;
  return { base: `https://api.atlassian.com/ex/jira/${JIRA_BUG_CLOUD_ID}/rest/servicedeskapi`, token: JIRA_BUG_API_TOKEN, secret: JIRA_BUG_RATE_LIMIT_SECRET };
}

export function bugReportingConfigured() { return Boolean(config()); }

async function consumeLimit(email, settings) {
  const hash = createHmac("sha256", settings.secret).update(email.toLowerCase()).digest("hex");
  const refs = [adminDb.collection("bug_report_rate_limits").doc("global"), adminDb.collection("bug_report_rate_limits").doc(hash)];
  const now = Date.now();
  return adminDb.runTransaction(async (transaction) => {
    const snapshots = await Promise.all(refs.map((ref) => transaction.get(ref)));
    const counts = snapshots.map((snapshot) => {
      const data = snapshot.data() || {};
      const start = data.windowStart?.toMillis?.() || 0;
      return now - start < WINDOW_MS ? { start, count: Number(data.count || 0) } : { start: now, count: 0 };
    });
    if (counts[0].count >= 50 || counts[1].count >= 3) return false;
    refs.forEach((ref, index) => transaction.set(ref, { windowStart: new Date(counts[index].start), count: counts[index].count + 1, expiresAt: new Date(now + 2 * WINDOW_MS) }));
    return true;
  });
}

async function jira(settings, path, options = {}) {
  return fetch(`${settings.base}${path}`, { ...options, headers: { Authorization: `Bearer ${settings.token}`, Accept: "application/json", ...(options.headers || {}) }, signal: AbortSignal.timeout(15000), cache: "no-store" });
}

// The server owns the Jira credentials. User-supplied values never select an API URL.
export async function submitBugReport({ email, summary, description, file }) {
  const settings = config();
  if (!settings) return { status: 503, error: "Bug reporting is not connected yet. Please use the support portal instead." };
  email = String(email || "").trim().toLowerCase();
  summary = String(summary || "").trim();
  description = String(description || "").trim();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || summary.length < 5 || summary.length > 160 || description.length < 10 || description.length > 8000) return { status: 400, error: "Please provide a valid email, a short summary, and at least 10 characters of detail." };
  if (file && (typeof file.arrayBuffer !== "function" || file.size < 1 || file.size > MAX_FILE_BYTES)) return { status: 400, error: "Please choose one file up to 3 MB." };
  if (!(await consumeLimit(email, settings))) return { status: 429, error: "Too many reports were submitted recently. Please try again later or use the support portal." };

  let attachmentId;
  if (file) {
    const upload = new FormData();
    upload.append("file", file, file.name);
    let response;
    try { response = await jira(settings, "/servicedesk/5/attachTemporaryFile", { method: "POST", headers: { "X-Atlassian-Token": "no-check", "X-ExperimentalApi": "opt-in" }, body: upload }); }
    catch { return { status: 503, error: "We couldn't upload your attachment. No report was sent; please try again or use the support portal." }; }
    const body = await response.json().catch(() => ({}));
    attachmentId = body.temporaryAttachments?.[0]?.temporaryAttachmentId;
    if (!response.ok || !attachmentId) return { status: 503, error: "We couldn't upload your attachment. No report was sent; please try again or use the support portal." };
  }

  let response;
  try {
    response = await jira(settings, "/request", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ serviceDeskId: "5", requestTypeId: "10220", requestFieldValues: { summary, description: `${description}\n\nReporter email (unverified): ${email}` } }) });
  } catch {
    return { status: 502, error: "We couldn't confirm whether your report reached Jira. Please check with GO support before submitting again." };
  }
  const result = await response.json().catch(() => ({}));
  if (response.status >= 500 || (response.ok && !result.issueKey)) return { status: 502, error: "We couldn't confirm whether your report reached Jira. Please check with GO support before submitting again." };
  if (!response.ok) return { status: 503, error: "We couldn't submit your report. Please use the support portal instead." };
  if (attachmentId) {
    try {
      const attached = await jira(settings, `/request/${encodeURIComponent(result.issueKey)}/attachment`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ public: true, temporaryAttachmentIds: [attachmentId] }) });
      if (!attached.ok) return { status: 201, reference: result.issueKey, attachmentFailed: true };
    } catch { return { status: 201, reference: result.issueKey, attachmentFailed: true }; }
  }
  return { status: 201, reference: result.issueKey, attachmentFailed: false };
}

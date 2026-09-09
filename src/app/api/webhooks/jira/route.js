import { adminDb } from "@/lib/firebase-admin";
import { jiraWebhookEventId, verifyJiraWebhook } from "@/lib/jira-support";
import { addProductNotificationToBatch } from "@/lib/product-notifications";

const STATUS_MAP = Object.freeze({
  open: "open",
  "to do": "open",
  "in progress": "in_progress",
  "waiting for customer": "waiting_on_member",
  "waiting on customer": "waiting_on_member",
  resolved: "resolved",
  done: "resolved",
  closed: "closed",
});

export async function POST(request) {
  const rawBody = await request.text();
  if (!verifyJiraWebhook(rawBody, request.headers.get("x-hub-signature-256"))) return Response.json({ error: "Invalid webhook signature" }, { status: 401 });
  const payload = JSON.parse(rawBody);
  const issueKey = String(payload?.issue?.key || "");
  const statusName = String(payload?.issue?.fields?.status?.name || "").trim().toLowerCase();
  const mappedStatus = STATUS_MAP[statusName];
  if (!issueKey || !mappedStatus) return Response.json({ received: true, applied: false });

  const eventId = jiraWebhookEventId(rawBody, request.headers.get("x-atlassian-webhook-identifier"));
  const eventRef = adminDb.collection("support_jira_events").doc(eventId);
  const tickets = await adminDb.collection("support_requests").where("jiraIssueKey", "==", issueKey).limit(1).get();
  if (tickets.empty) return Response.json({ received: true, applied: false });
  const ticketRef = tickets.docs[0].ref;
  const applied = await adminDb.runTransaction(async (transaction) => {
    const existing = await transaction.get(eventRef);
    if (existing.exists) return false;
    const ticket = await transaction.get(ticketRef);
    transaction.create(eventRef, { issueKey, status: mappedStatus, receivedAt: new Date() });
    transaction.update(ticketRef, { status: mappedStatus, updatedAt: new Date(), jiraSyncStatus: "synced", jiraSyncError: null });
    transaction.create(adminDb.collection("support_audit_events").doc(), { ticketId: ticket.id, actorId: "jira", action: "support.jira_status_synced", previousValue: { status: ticket.data().status }, newValue: { status: mappedStatus }, createdAt: new Date() });
    addProductNotificationToBatch(transaction, { recipientUserId: ticket.data().requesterId, type: "support_update", title: "Support request status updated", message: `“${ticket.data().subject}” is now ${mappedStatus.replaceAll("_", " ")}.`, actionUrl: `/profile?tab=support&ticket=${ticket.id}` }, new Date());
    return true;
  });
  return Response.json({ received: true, applied });
}

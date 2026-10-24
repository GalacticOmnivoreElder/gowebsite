import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { adminDb } from "@/lib/firebase-admin";
import { getRequestUser } from "@/lib/auth-utils";
import { availabilitySchema, matchesAvailability, summarizeMerch, MERCH_DESIGNS } from "@/lib/merch-core";
import { readMerchBody, merchError, requireMerchEmail } from "@/lib/merch-server";
import { hashValue } from "@/lib/email/utils";
import { addEmailEventToBatch, processEmailOutbox } from "@/lib/email/outbox";
import { sendEmailJob } from "@/lib/email/send-email";

export const runtime = "nodejs";
export const maxDuration = 60;
const MAX_ADMIN_MERCH_REQUESTS = 5000;
const MAX_BATCH_DELIVERY_ROWS = 1000;
const AVAILABILITY_EMAIL_CHUNK = 20;
const json = (data, status = 200) => NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });
const productName = (batch) => batch.offerId === "duo" ? "GO two-T-shirt package" : `GO ${MERCH_DESIGNS.find((item) => item.id === batch.design)?.name || ""} T-shirt`.replace("  ", " ");
async function requireAdmin(request) {
  const user = await getRequestUser(request);
  if (!user) throw merchError("Authentication required.", 401);
  if (!user.admin) throw merchError("Platform admin access required.", 403);
  return user;
}
async function allRequests() {
  const results = []; let cursor = null;
  while (results.length < MAX_ADMIN_MERCH_REQUESTS) {
    const pageSize = Math.min(300, MAX_ADMIN_MERCH_REQUESTS - results.length);
    let query = adminDb.collection("merch_requests").orderBy("__name__").limit(pageSize);
    if (cursor) query = query.startAfter(cursor);
    const page = await query.get();
    page.docs.forEach((doc) => results.push({ id: doc.id, ...doc.data() }));
    if (page.size < pageSize) return { rows: results, truncated: false };
    cursor = page.docs[page.docs.length - 1];
  }
  return { rows: results, truncated: true };
}
export async function GET(request) {
  try {
    await requireAdmin(request);
    const [requestPage, suggestions, batches] = await Promise.all([
      allRequests(), adminDb.collection("merch_suggestions").orderBy("createdAt", "desc").limit(100).get(), adminDb.collection("merch_batches").orderBy("createdAt", "desc").limit(30).get(),
    ]);
    const requests = requestPage.rows;
    const batchRows = await Promise.all(batches.docs.map(async (doc) => {
      const jobs = await adminDb.collection("email_outbox").where("eventId", "==", doc.id).limit(MAX_BATCH_DELIVERY_ROWS).get();
      const delivery = {};
      jobs.docs.forEach((job) => { const status = job.data().deliveryStatus || job.data().status; delivery[status] = (delivery[status] || 0) + 1; });
      return { id: doc.id, ...doc.data(), delivery };
    }));
    return json({ summary: summarizeMerch(requests), requests: requests.filter((item) => item.status !== "withdrawn").map(({ id, email, phone, status, active, reservation, updatedAt }) => ({ id, email, phone: phone || null, status, active: active || null, reservation: reservation || null, updatedAt })), suggestions: suggestions.docs.map((doc) => ({ id: doc.id, ...doc.data() })), batches: batchRows, truncated: requestPage.truncated });
  } catch (error) { return json({ error: error.status ? error.message : "Could not load merch data." }, error.status || 500); }
}
export async function POST(request) {
  try {
    const user = await requireAdmin(request);
    const body = await readMerchBody(request);
    if (body.action === "review_suggestion") {
      if (!/^[a-f0-9]{64}$/.test(body.id || "")) throw merchError("Invalid suggestion.");
      await adminDb.collection("merch_suggestions").doc(body.id).update({ status: "reviewed", reviewedAt: Date.now(), reviewedBy: user.uid });
      return json({ success: true });
    }
    if (body.action === "prepare") {
      const parsed = availabilitySchema.safeParse(body);
      if (!parsed.success) return json({ error: parsed.error.issues[0].message, fieldErrors: parsed.error.flatten().fieldErrors }, 400);
      const batch = { ...parsed.data, sizes: [...new Set(parsed.data.sizes)].sort() };
      const id = hashValue(JSON.stringify(batch));
      const ref = adminDb.collection("merch_batches").doc(id);
      await adminDb.runTransaction(async (transaction) => {
        const existing = await transaction.get(ref);
        if (!existing.exists) transaction.create(ref, { ...batch, state: "prepared", cursor: null, queued: 0, createdAt: Date.now(), createdBy: user.uid });
      });
      const requestPage = await allRequests();
      const count = requestPage.rows.filter((item) => matchesAvailability(item, batch)).length;
      return json({ id, ...batch, count, countIsMinimum: requestPage.truncated, productName: productName(batch) });
    }
    if (!["send", "test"].includes(body.action) || !/^[a-f0-9]{64}$/.test(body.id || "")) throw merchError("Invalid action.");
    requireMerchEmail();
    const ref = adminDb.collection("merch_batches").doc(body.id);
    if (body.action === "test") {
      const snapshot = await ref.get(); const batch = snapshot.data();
      if (!batch) throw merchError("Prepare the notification before sending a test.");
      if (!user.email || user.claims?.email_verified !== true) throw merchError("Verify your admin account’s email address before sending a test.");
      const result = await sendEmailJob({ eventType: "merch.available", category: "merch", recipient: user.email, idempotencyKey: `merch-test-${body.id}-${randomUUID()}`, templateData: { requestId: hashValue(user.email), manageVersion: "test-link-no-request-access", productName: productName(batch), batch } });
      return json({ message: result.status === "sent" ? "Test sent to your admin email (or configured preview test mailbox). The leave link is intentionally inactive." : "Test delivery is disabled." });
    }
    const result = await adminDb.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(ref); const batch = snapshot.data();
      if (!batch) throw merchError("Prepare the notification first.");
      if (batch.state === "queued") return { done: true, queued: batch.queued };
      let query = adminDb.collection("merch_requests").orderBy("__name__").limit(AVAILABILITY_EMAIL_CHUNK);
      if (batch.cursor) query = query.startAfter(batch.cursor);
      const page = await transaction.get(query);
      let queued = batch.queued;
      const emailJobIds = [];
      for (const doc of page.docs) {
        const requestData = doc.data();
        if (!matchesAvailability(requestData, batch)) continue;
        const emailJob = addEmailEventToBatch(transaction, {
          type: "merch.available", eventId: body.id, recipient: requestData.email,
          data: { requestId: doc.id, manageVersion: requestData.manageVersion, productName: productName(batch), batch: { productId: batch.productId, design: batch.design, offerId: batch.offerId || "all", sizes: batch.sizes, location: batch.location, details: batch.details, checkoutUrl: batch.checkoutUrl || "" } },
        });
        emailJobIds.push(emailJob.id);
        queued++;
      }
      const done = page.size < AVAILABILITY_EMAIL_CHUNK;
      transaction.update(ref, { queued, cursor: page.docs.at(-1)?.id || batch.cursor, state: done ? "queued" : "sending", updatedAt: Date.now(), sentBy: user.uid });
      return { done, queued, emailJobIds };
    });
    const delivery = result.emailJobIds?.length
      ? await processEmailOutbox({ jobIds: result.emailJobIds, limit: AVAILABILITY_EMAIL_CHUNK })
      : { sent: 0, failed: 0, suppressed: 0 };
    const publicResult = { ...result };
    delete publicResult.emailJobIds;
    return json({ ...publicResult, delivery });
  } catch (error) { return json({ error: error.status ? error.message : "Could not complete this action. Retry to resume safely." }, error.status || 500); }
}

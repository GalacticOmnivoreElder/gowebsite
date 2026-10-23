import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { addEmailEventToBatch, createEmailOutboxJob, processEmailOutbox } from "@/lib/email/outbox";
import { hashValue } from "@/lib/email/utils";
import { consumeNewsletterRateLimit, newsletterFingerprint } from "@/lib/email/newsletter";
import { merchReservationSchema, createMerchReservation, merchRequestExpiry, suggestionSchema, MERCH_CONSENT, MERCH_LEGACY_CONSENT } from "@/lib/merch-core";
import { readMerchToken } from "@/lib/merch-tokens";

export const merchResponse = { message: "Your T-shirt reservation is saved. We’ll email you when there’s an update." };
export function merchError(message, status = 400) { return Object.assign(new Error(message), { status }); }
export function requireMerchEmail() {
  if (!process.env.RESEND_API_KEY || !process.env.NEWSLETTER_TOKEN_SECRET || !process.env.EMAIL_FROM_TRANSACTIONAL || process.env.EMAIL_DISABLE_SEND === "true") throw merchError("The waitlist is temporarily unavailable. Please try again later.", 503);
  if (process.env.VERCEL_ENV !== "production" && process.env.EMAIL_PRODUCTION_DELIVERY !== "true" && !process.env.EMAIL_TEST_RECIPIENT) throw merchError("The waitlist is temporarily unavailable. Please try again later.", 503);
}
export async function readMerchBody(request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) throw merchError("Invalid request origin.", 403);
  if (!request.headers.get("content-type")?.includes("application/json")) throw merchError("JSON is required.", 415);
  const reader = request.body?.getReader();
  if (!reader) throw merchError("Request is required.");
  const parts = []; let size = 0;
  while (true) {
    const { done, value } = await reader.read(); if (done) break;
    size += value.byteLength;
    if (size > 16000) { await reader.cancel(); throw merchError("Request is too large.", 413); }
    parts.push(Buffer.from(value));
  }
  try { return JSON.parse(Buffer.concat(parts).toString()); } catch { throw merchError("Invalid request."); }
}
export async function limitMerch(request, email = "") {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  // Separate IP and address limits prevent rotating email addresses from bypassing the IP limit.
  for (const fingerprint of [newsletterFingerprint(ip, "", "merch-ip"), ...(email ? [newsletterFingerprint("", email, "merch-email")] : [])]) {
    if (!await consumeNewsletterRateLimit(fingerprint)) throw merchError("Too many requests. Please try again in an hour.", 429);
  }
}
export async function submitMerchReservation(body) {
  if (body.company) return merchResponse;
  const parsed = merchReservationSchema.safeParse(body);
  if (!parsed.success) throw merchError(parsed.error.issues[0].message);
  requireMerchEmail();
  const data = parsed.data;
  const id = hashValue(data.email);
  const ref = adminDb.collection("merch_requests").doc(id);
  const now = Date.now();
  const suppression = await adminDb.collection("email_suppressions").doc(id).get();
  if (["bounced", "complained", "suppressed"].includes(suppression.data()?.status)) {
    throw merchError("This email address cannot receive updates. Use another email address.");
  }

  const reservation = createMerchReservation(data);
  const pendingManageVersion = hashValue(`${id}:${data.submissionId}:manage`);
  const submissionHash = hashValue(JSON.stringify({ email: data.email, phone: data.phone, reservation }));
  const emailJobId = await adminDb.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref); const previous = snapshot.data() || {};
    const samePendingSubmission = previous.pending?.reservationId === data.submissionId;
    const sameActiveSubmission = previous.reservationId === data.submissionId && !previous.pending && ["reserved", "confirmed"].includes(previous.status);
    const priorHash = samePendingSubmission ? previous.pending.submissionHash : sameActiveSubmission ? previous.reservationSubmissionHash : null;
    if (priorHash && priorHash !== submissionHash) throw merchError("Your choices changed. Please submit the form again.");
    const event = {
      type: "merch.reservation_received",
      eventId: `${id}:${data.submissionId}`,
      recipient: data.email,
      data: {
        requestId: id,
        reservationId: data.submissionId,
        version: data.submissionId,
        expires: samePendingSubmission ? previous.pending.expires : now + 48 * 60 * 60 * 1000,
        manageVersion: samePendingSubmission ? previous.pending.manageVersion : sameActiveSubmission ? previous.manageVersion : pendingManageVersion,
        reservation: {
          offerId: reservation.offerId,
          offerName: reservation.offerName,
          packageQuantity: reservation.packageQuantity,
          items: reservation.items,
          quantity: reservation.quantity,
          pricingMode: reservation.pricingMode,
          proposedTotalPrice: reservation.proposedTotalPrice,
          currency: reservation.currency,
          city: reservation.city,
          fulfillment: reservation.fulfillment,
        },
      },
    };
    if (sameActiveSubmission) return createEmailOutboxJob(event, new Date(now)).id;
    const sameSubmission = samePendingSubmission;
    const pending = {
      reservation,
      phone: data.phone,
      reservationId: data.submissionId,
      submissionHash,
      version: data.submissionId,
      expires: sameSubmission ? previous.pending.expires : now + 48 * 60 * 60 * 1000,
      createdAt: sameSubmission ? previous.pending.createdAt : now,
      manageVersion: pendingManageVersion,
    };
    const status = ["reserved", "confirmed"].includes(previous.status) ? previous.status : "pending";
    const requestExpiresAt = merchRequestExpiry({ previousExpiry: status === "pending" ? null : previous.pendingExpiresAt || previous.reservationExpiresAt, now });
    event.data.expires = pending.expires;
    event.data.manageVersion = pending.manageVersion;
    transaction.set(ref, {
      ...previous,
      email: data.email,
      status,
      pending,
      manageVersion: previous.manageVersion || pending.manageVersion,
      // Reuse the existing TTL field: Firestore permits one TTL field per collection group.
      pendingExpiresAt: requestExpiresAt,
      reservationExpiresAt: FieldValue.delete(),
      createdAt: previous.createdAt || now, updatedAt: now,
    }, { merge: true });
    if (sameSubmission) return createEmailOutboxJob(event, new Date(now)).id;
    return addEmailEventToBatch(transaction, event, new Date(now)).id;
  });

  const delivery = await processEmailOutbox({ jobIds: [emailJobId] });
  const emailJob = await adminDb.collection("email_outbox").doc(emailJobId).get();
  const emailStatus = emailJob.data()?.status;
  return {
    message: delivery.failed || ["pending", "processing"].includes(emailStatus)
      ? "Your request is saved. We couldn’t send the confirmation email just now, but we’ll retry automatically."
      : emailStatus === "sent"
        ? "Check your email and confirm the request to join the GO T-shirt waitlist. The confirmation email has been sent."
        : delivery.suppressed || emailStatus === "suppressed"
        ? "Your request is saved, but we couldn’t send a confirmation to this email address. Check it or contact GO."
        : "Your request is saved, but we couldn’t send the confirmation email. Contact GO for help.",
  };
}
export async function saveMerchSuggestion(body) {
  if (body.company) return { message: "Thank you. Your suggestion has been sent to GO." };
  const parsed = suggestionSchema.safeParse(body);
  if (!parsed.success) throw merchError("Enter a suggestion between 2 and 120 characters, with details up to 1,000 characters.");
  // Identical retries are idempotent; suggestions carry no contact details.
  const id = hashValue(JSON.stringify(parsed.data));
  const ref = adminDb.collection("merch_suggestions").doc(id);
  await adminDb.runTransaction(async (transaction) => {
    const existing = await transaction.get(ref);
    if (!existing.exists) transaction.create(ref, { ...parsed.data, status: "new", createdAt: Date.now(), expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) });
  });
  return { message: "Thank you. Your suggestion has been sent to GO." };
}
export async function merchAction(body) {
  const purpose = body.action === "confirm" ? "confirm" : "manage";
  const token = readMerchToken(body.token, purpose);
  if (!token) throw merchError("This link is invalid or expired. Submit your choices again to receive a new email.");
  const ref = adminDb.collection("merch_requests").doc(token.id);
  return adminDb.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref); const data = snapshot.data();
    if (!data) throw merchError("This request is no longer available.");
    if (body.action === "confirm") {
      if (data.confirmedVersion === token.version && ["confirmed", "reserved"].includes(data.status)) return { message: data.status === "reserved" ? "Your GO T-shirt reservation is confirmed." : "Your GO merch request is confirmed." };
      if (data.pending?.version !== token.version || data.pending.expires <= Date.now()) throw merchError("This confirmation has expired or been replaced. Submit your choices again.");
      if (data.pending.reservation) {
        const { reservation, phone, reservationId, submissionHash, manageVersion } = data.pending;
        const confirmedAt = Date.now();
        transaction.update(ref, {
          reservation,
          phone,
          reservationId,
          reservationSubmissionHash: submissionHash,
          manageVersion,
          pending: null,
          pendingExpiresAt: merchRequestExpiry({ confirmed: true, now: confirmedAt }),
          status: "reserved",
          confirmedVersion: token.version,
          confirmedAt,
          updatedAt: confirmedAt,
          reservationExpiresAt: FieldValue.delete(),
          active: FieldValue.delete(),
          consent: { text: MERCH_CONSENT, version: "merch-v2", confirmedAt },
        });
        return { message: "Your GO T-shirt reservation is confirmed. We’ll email you when it’s available." };
      }
      const { version, expires, createdAt, ...active } = data.pending;
      transaction.update(ref, { active, pending: null, pendingExpiresAt: FieldValue.delete(), status: "confirmed", confirmedVersion: version, confirmedAt: Date.now(), updatedAt: Date.now(), consent: { text: MERCH_LEGACY_CONSENT, version: "merch-v1", confirmedAt: Date.now() } });
      return { message: "Your GO merch request is confirmed. We’ll email you when your selected merchandise is available." };
    }
    if (data.manageVersion !== token.version && data.pending?.manageVersion !== token.version) throw merchError("This link is no longer valid.");
    if (body.action === "withdraw") {
      // Deleting the request removes every stored choice and contact field in a
      // single operation. Any queued merch job is re-checked against this
      // document before delivery, so deletion also suppresses pending mail and
      // invalidates every previously issued management token.
      transaction.delete(ref);
      return { message: "Your GO T-shirt reservation has been cancelled and your contact and delivery details have been removed." };
    }
    throw merchError("Unknown action.");
  });
}

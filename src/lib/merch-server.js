import crypto from "crypto";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { addEmailEventToBatch } from "@/lib/email/outbox";
import { hashValue } from "@/lib/email/utils";
import { consumeNewsletterRateLimit, newsletterFingerprint } from "@/lib/email/newsletter";
import { merchRequestSchema, suggestionSchema, MERCH_CONSENT } from "@/lib/merch-core";
import { readMerchToken } from "@/lib/merch-tokens";

export const merchResponse = { message: "Check your inbox to confirm your request. If you have already confirmed, a new confirmation will update your choices. Please allow a few minutes and check your spam folder." };
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
export async function submitMerch(body) {
  if (body.company) return merchResponse;
  const parsed = merchRequestSchema.safeParse(body);
  if (!parsed.success) throw merchError(parsed.error.issues[0].message);
  requireMerchEmail();
  const data = parsed.data; const id = hashValue(data.email);
  const ref = adminDb.collection("merch_requests").doc(id);
  const now = Date.now(); const version = crypto.randomUUID();
  const expires = now + 48 * 60 * 60 * 1000;
  const suppression = await adminDb.collection("email_suppressions").doc(id).get();
  if (["bounced", "complained", "suppressed"].includes(suppression.data()?.status)) return merchResponse;
  await adminDb.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref); const previous = snapshot.data() || {};
    const retained = { ...previous };
    delete retained.pendingExpiresAt;
    const manageVersion = previous.manageVersion || crypto.randomUUID();
    if (previous.pending && now - previous.pending.createdAt < 5 * 60 * 1000) return;
    transaction.set(ref, {
      ...retained, email: data.email, status: previous.status === "confirmed" ? "confirmed" : "pending",
      manageVersion,
      pending: { ...data, version, expires, createdAt: now },
      ...(previous.status === "confirmed" ? {} : { pendingExpiresAt: new Date(now + 30 * 24 * 60 * 60 * 1000) }),
      createdAt: previous.createdAt || now, updatedAt: now,
    });
    addEmailEventToBatch(transaction, { type: "merch.confirm", eventId: `${id}:${version}`, recipient: data.email, data: { requestId: id, version, expires, manageVersion } });
  });
  return merchResponse;
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
      if (data.confirmedVersion === token.version && data.status === "confirmed") return { message: "Your GO merch request is confirmed." };
      if (data.pending?.version !== token.version || data.pending.expires <= Date.now()) throw merchError("This confirmation has expired or been replaced. Submit your choices again.");
      const { version, expires, createdAt, ...active } = data.pending;
      transaction.update(ref, { active, pending: null, pendingExpiresAt: FieldValue.delete(), status: "confirmed", confirmedVersion: version, confirmedAt: Date.now(), updatedAt: Date.now(), consent: { text: MERCH_CONSENT, version: "merch-v1", confirmedAt: Date.now() } });
      return { message: "Your GO merch request is confirmed. We’ll email you when your selected merchandise is available." };
    }
    if (data.manageVersion !== token.version) throw merchError("This link is no longer valid.");
    if (body.action === "withdraw") {
      transaction.set(ref, { status: "withdrawn", manageVersion: crypto.randomUUID(), pendingExpiresAt: FieldValue.delete(), updatedAt: Date.now() });
      return { message: "You have left the merch waitlist. Your request details have been removed." };
    }
    throw merchError("Unknown action.");
  });
}

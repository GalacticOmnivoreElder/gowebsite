import { adminDb } from "@/lib/firebase-admin";

const WEBHOOK_LEASE_MS = 5 * 60 * 1000;
const WEBHOOK_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

function markerRef(webhookId, eventType) {
  return adminDb
    .collection("processed_webhooks")
    .doc(`${eventType}_${webhookId}`);
}

function toDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value.toDate === "function") return value.toDate();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export async function isWebhookProcessed(webhookId, eventType) {
  const webhookDoc = await markerRef(webhookId, eventType).get();
  if (!webhookDoc.exists) return false;
  const status = webhookDoc.data()?.status;
  return status === "processed" || status === undefined;
}

export async function claimWebhookProcessing(
  webhookId,
  eventType,
  eventData,
  now = new Date()
) {
  const ref = markerRef(webhookId, eventType);
  return adminDb.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    if (snapshot.exists) {
      const marker = snapshot.data();
      if (marker.status === "processed" || marker.status === undefined) {
        return false;
      }

      const leaseUntil = toDate(marker.leaseUntil);
      if (
        marker.status === "processing" &&
        leaseUntil &&
        leaseUntil.getTime() > now.getTime()
      ) {
        return false;
      }
    }

    transaction.set(
      ref,
      {
        claimedAt: now,
        eventType,
        expiresAt: new Date(now.getTime() + WEBHOOK_RETENTION_MS),
        leaseUntil: new Date(now.getTime() + WEBHOOK_LEASE_MS),
        status: "processing",
        subjectId: eventData?.data?.id || eventData?.id || null,
        webhookId,
      },
      { merge: true }
    );
    return true;
  });
}

export async function markWebhookProcessed(
  webhookId,
  eventType,
  eventData,
  now = new Date()
) {
  await markerRef(webhookId, eventType).set(
    {
      eventType,
      expiresAt: new Date(now.getTime() + WEBHOOK_RETENTION_MS),
      leaseUntil: null,
      processedAt: now,
      status: "processed",
      // Retain only the subject identifier required for support/debugging.
      // Full Polar payloads may contain customer and payment information.
      subjectId: eventData?.data?.id || eventData?.id || null,
      webhookId,
    },
    { merge: true }
  );
}

export async function releaseWebhookProcessing(webhookId, eventType) {
  const ref = markerRef(webhookId, eventType);
  await adminDb.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists || snapshot.data()?.status !== "processing") return;
    transaction.delete(ref);
  });
}

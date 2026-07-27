import { adminDb } from "@/lib/firebase-admin";
import { getResend } from "@/lib/resend";
import {
  suppressNewsletterSubscriber,
  syncNewsletterContactEvent,
} from "./newsletter";
import { suppressEmailAddress } from "./suppression";
import { normalizeEmail } from "./utils";

const DELIVERY_STATUS = Object.freeze({
  "email.sent": "sent",
  "email.delivered": "delivered",
  "email.delivery_delayed": "delivery_delayed",
  "email.failed": "failed",
  "email.bounced": "bounced",
  "email.complained": "complained",
  "email.suppressed": "suppressed",
  "email.opened": "opened",
  "email.clicked": "clicked",
});

export function verifyResendWebhook({ payload, headers, secret }) {
  if (!secret) throw new Error("RESEND_WEBHOOK_SECRET is not configured");
  if (!headers?.id || !headers?.timestamp || !headers?.signature) {
    throw new Error("Missing Resend webhook signature headers");
  }
  return getResend().webhooks.verify({
    payload,
    headers,
    webhookSecret: secret,
  });
}

async function claimWebhook(providerEventId, eventType) {
  const ref = adminDb
    .collection("processed_email_webhooks")
    .doc(providerEventId);
  const claimed = await adminDb.runTransaction(async (transaction) => {
    const existing = await transaction.get(ref);
    if (existing.exists) return false;
    transaction.create(ref, {
      providerEventId,
      eventType,
      status: "processing",
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });
    return true;
  });
  return { ref, claimed };
}

async function updateOutboxDelivery(eventType, data, providerEventId, occurredAt) {
  const providerEmailId = data?.email_id || data?.emailId;
  if (!providerEmailId) return;
  const snapshot = await adminDb
    .collection("email_outbox")
    .where("providerEmailId", "==", providerEmailId)
    .limit(1)
    .get();
  if (snapshot.empty) return;

  const ref = snapshot.docs[0].ref;
  const status = DELIVERY_STATUS[eventType];
  const update = {
    deliveryStatus: status,
    lastProviderEventAt: occurredAt,
    updatedAt: new Date(),
  };
  if (["failed", "bounced"].includes(status)) {
    update.status = "failed";
    update.lastErrorCode = status;
    update.expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
  }
  if (["complained", "suppressed"].includes(status)) {
    update.status = "suppressed";
    update.suppressionReason = status;
    update.expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
  }
  if (status === "delivered") update.deliveredAt = occurredAt;
  await ref.update(update);

  await adminDb.collection("email_delivery_events").doc(providerEventId).set({
    providerEventId,
    providerEmailId,
    outboxId: snapshot.docs[0].id,
    eventType,
    occurredAt,
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
  });
}

function impactedEmail(data) {
  const value = Array.isArray(data?.to) ? data.to[0] : data?.to || data?.email;
  return normalizeEmail(value);
}

export async function processResendWebhook({
  providerEventId,
  event,
}) {
  const eventType = event?.type;
  const data = event?.data || {};
  const claim = await claimWebhook(providerEventId, eventType);
  if (!claim.claimed) return { duplicate: true };

  try {
    const occurredAt = new Date(event.created_at || Date.now());
    if (DELIVERY_STATUS[eventType]) {
      if (
        ["email.opened", "email.clicked"].includes(eventType) &&
        process.env.EMAIL_TRACK_ENGAGEMENT !== "true"
      ) {
        await claim.ref.update({
          status: "processed",
          ignored: "engagement_tracking_disabled",
          processedAt: new Date(),
        });
        return { ignored: true };
      }

      await updateOutboxDelivery(
        eventType,
        data,
        providerEventId,
        occurredAt
      );

      const suppressionStatus = {
        "email.bounced": "bounced",
        "email.complained": "complained",
        "email.suppressed": "suppressed",
      }[eventType];
      if (suppressionStatus) {
        const email = impactedEmail(data);
        await suppressEmailAddress({
          email,
          status: suppressionStatus,
          providerEventId,
        });
        await suppressNewsletterSubscriber({
          email,
          status: suppressionStatus,
          providerEventId,
        });
      }
    }

    if (["contact.created", "contact.updated", "contact.deleted"].includes(eventType)) {
      await syncNewsletterContactEvent({
        email: data.email,
        contactId: data.id,
        unsubscribed: data.unsubscribed,
        deleted: eventType === "contact.deleted",
        providerEventId,
      });
    }

    await claim.ref.update({ status: "processed", processedAt: new Date() });
    return { processed: true };
  } catch (error) {
    await claim.ref.delete();
    throw error;
  }
}

import { adminDb } from "@/lib/firebase-admin";
import { getResend } from "@/lib/resend";
import { enqueueEmailEvent } from "./outbox";
import {
  createNewsletterConfirmationToken,
  createNewsletterConfirmationVersion,
  createSignedActionToken,
  hashOpaqueToken,
  hashValue,
  normalizeEmail,
  verifySignedActionToken,
} from "./utils";

export const NEWSLETTER_GENERIC_RESPONSE = Object.freeze({
  success: true,
  message:
    "If this address can be subscribed, a confirmation email will arrive shortly.",
});

export const NEWSLETTER_CONSENT_VERSION = "newsletter-v1";
export const PRIVACY_POLICY_VERSION = "2026-07-27";
export const NEWSLETTER_CONSENT_TEXT =
  "I want to receive the Galactic Omnivore newsletter and understand that I can unsubscribe at any time.";

const ALLOWED_SOURCES = new Set([
  "homepage",
  "footer",
  "signup",
  "profile",
  "admin_import",
  "preferences",
]);
const CONFIRMATION_TTL_MS = 48 * 60 * 60 * 1000;
const SIGNUP_WINDOW_MS = 60 * 60 * 1000;
const SIGNUP_LIMIT = 5;
const AUDIT_RETENTION_MS = 3 * 365 * 24 * 60 * 60 * 1000;

function subscriberRefForEmail(email) {
  return adminDb
    .collection("newsletter_subscribers")
    .doc(hashValue(normalizeEmail(email)));
}

function newsletterEventRef() {
  return adminDb.collection("newsletter_events").doc();
}

function auditEvent(data) {
  const occurredAt = data.occurredAt || new Date();
  return {
    ...data,
    occurredAt,
    expiresAt: new Date(new Date(occurredAt).getTime() + AUDIT_RETENTION_MS),
  };
}

function sanitizeSource(source) {
  return ALLOWED_SOURCES.has(source) ? source : "homepage";
}

export function newsletterFingerprint(ipAddress, email = "", purpose = "signup") {
  const salt =
    process.env.NEWSLETTER_TOKEN_SECRET || "newsletter-rate-limit-fallback";
  return hashValue(
    `${salt}:${purpose}:${String(ipAddress || "unknown")}:${normalizeEmail(email)}`
  );
}

export async function consumeNewsletterRateLimit(fingerprint, now = new Date()) {
  const ref = adminDb.collection("newsletter_rate_limits").doc(fingerprint);
  return adminDb.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    const data = snapshot.exists ? snapshot.data() : {};
    const windowStart =
      data.windowStart?.toDate?.() || data.windowStart || new Date(0);
    const inWindow = now.getTime() - new Date(windowStart).getTime() < SIGNUP_WINDOW_MS;
    const count = inWindow ? Number(data.count || 0) : 0;
    if (count >= SIGNUP_LIMIT) return false;

    transaction.set(
      ref,
      {
        count: count + 1,
        windowStart: inWindow ? new Date(windowStart) : now,
        updatedAt: now,
        expiresAt: new Date(now.getTime() + 2 * SIGNUP_WINDOW_MS),
      },
      { merge: true }
    );
    return true;
  });
}

export async function requestNewsletterSubscription({
  email,
  source,
  consent,
  userId = null,
  verifiedUserEmail = null,
  honeypot = "",
}) {
  if (honeypot) return NEWSLETTER_GENERIC_RESPONSE;
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) {
    const error = new Error("Enter a valid email address");
    error.code = "invalid_email";
    throw error;
  }
  if (consent !== true) {
    const error = new Error("Newsletter consent is required");
    error.code = "consent_required";
    throw error;
  }

  const now = new Date();
  const ref = subscriberRefForEmail(normalizedEmail);
  const confirmationVersion = createNewsletterConfirmationVersion();
  const token = createNewsletterConfirmationToken(ref.id, confirmationVersion);
  const confirmationTokenHash = hashOpaqueToken(token);
  const safeSource = sanitizeSource(source);
  let shouldSendConfirmation = false;
  let subscriberId = ref.id;

  await adminDb.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    const existing = snapshot.exists ? snapshot.data() : null;

    if (
      existing?.status === "subscribed" ||
      existing?.status === "complained" ||
      existing?.status === "suppressed" ||
      existing?.status === "bounced"
    ) {
      transaction.create(newsletterEventRef(), auditEvent({
        subscriberId,
        eventType: "signup_requested",
        source: safeSource,
        occurredAt: now,
        outcome: "no_change",
      }));
      return;
    }

    const previousExpiry =
      existing?.confirmationExpiresAt?.toDate?.() ||
      existing?.confirmationExpiresAt;
    const hasActiveConfirmation =
      existing?.status === "pending" &&
      previousExpiry &&
      new Date(previousExpiry).getTime() > now.getTime();

    if (hasActiveConfirmation) {
      transaction.create(newsletterEventRef(), auditEvent({
        subscriberId,
        eventType: "signup_requested",
        source: safeSource,
        occurredAt: now,
        outcome: "no_change",
      }));
      return;
    }

    const canAssociateUser =
      userId &&
      normalizeEmail(verifiedUserEmail) === normalizedEmail;
    const next = {
      normalizedEmail,
      userId: canAssociateUser ? userId : existing?.userId || null,
      status: "pending",
      topics: {
        newsletter: true,
        newPackages: existing?.topics?.newPackages === true,
        promotions: existing?.topics?.promotions === true,
      },
      source: safeSource,
      consentVersion: NEWSLETTER_CONSENT_VERSION,
      consentText: NEWSLETTER_CONSENT_TEXT,
      privacyPolicyVersion: PRIVACY_POLICY_VERSION,
      requestedAt: now,
      confirmationTokenHash,
      confirmationVersion,
      confirmationExpiresAt: new Date(now.getTime() + CONFIRMATION_TTL_MS),
      actionTokenVersion: Number(existing?.actionTokenVersion || 1),
      providerContactId: existing?.providerContactId || null,
      bounceCount: Number(existing?.bounceCount || 0),
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    };

    transaction.set(ref, next, { merge: true });
    transaction.create(newsletterEventRef(), auditEvent({
      subscriberId,
      eventType: "signup_requested",
      source: safeSource,
      occurredAt: now,
      outcome: existing?.status === "unsubscribed" ? "resubscribe_pending" : "pending",
    }));
    shouldSendConfirmation = true;
  });

  if (shouldSendConfirmation) {
    await enqueueEmailEvent({
      type: "newsletter.confirm",
      eventId: confirmationTokenHash.slice(0, 24),
      recipient: normalizedEmail,
      data: { subscriberId, confirmationVersion },
    });
    await newsletterEventRef().set(auditEvent({
      subscriberId,
      eventType: "confirmation_sent",
      source: safeSource,
      occurredAt: new Date(),
    }));
  }

  return NEWSLETTER_GENERIC_RESPONSE;
}

async function syncResendContact(subscriber, subscription = "opt_in") {
  const production =
    process.env.VERCEL_ENV
      ? process.env.VERCEL_ENV === "production"
      : process.env.NODE_ENV === "production";
  if (
    !production ||
    !process.env.RESEND_API_KEY ||
    process.env.EMAIL_DISABLE_SEND === "true"
  ) {
    return { skipped: true };
  }

  const resend = getResend();
  const topicSubscriptions = [
    {
      id: process.env.RESEND_NEWSLETTER_TOPIC_ID,
      enabled: subscriber.topics?.newsletter === true,
    },
    {
      id: process.env.RESEND_PACKAGE_TOPIC_ID,
      enabled: subscriber.topics?.newPackages === true,
    },
    {
      id: process.env.RESEND_PROMOTIONS_TOPIC_ID,
      enabled: subscriber.topics?.promotions === true,
    },
  ]
    .filter((topic) => topic.id)
    .map((topic) => ({
      id: topic.id,
      subscription:
        subscription === "opt_out" || !topic.enabled ? "opt_out" : "opt_in",
    }));
  const segmentId = process.env.RESEND_NEWSLETTER_SEGMENT_ID;

  let providerContactId = subscriber.providerContactId || null;
  const existing = await resend.contacts.get({
    email: subscriber.normalizedEmail,
  });

  if (!existing.error && existing.data) {
    providerContactId = existing.data.id;
    const update = await resend.contacts.update({
      id: providerContactId,
      unsubscribed: subscription === "opt_out",
    });
    if (update.error) throw new Error(update.error.message);
  } else {
    if (
      existing.error &&
      !["not_found", "not_found_error"].includes(existing.error.name)
    ) {
      throw new Error(existing.error.message || "Contact lookup failed");
    }
    const created = await resend.contacts.create({
      email: subscriber.normalizedEmail,
      unsubscribed: subscription === "opt_out",
      segments:
        subscription === "opt_in" && segmentId ? [{ id: segmentId }] : [],
      topics: topicSubscriptions,
    });
    if (created.error) throw new Error(created.error.message);
    providerContactId = created.data?.id || null;
  }

  if (providerContactId && topicSubscriptions.length) {
    const topics = await resend.contacts.topics.update({
      id: providerContactId,
      topics: topicSubscriptions,
    });
    if (topics.error) throw new Error(topics.error.message);
  }

  if (providerContactId && segmentId && subscription === "opt_in") {
    const segment = await resend.contacts.segments.add({
      contactId: providerContactId,
      segmentId,
    });
    if (segment.error && segment.error.name !== "validation_error") {
      throw new Error(segment.error.message);
    }
  }
  if (providerContactId && segmentId && subscription === "opt_out") {
    const segment = await resend.contacts.segments.remove({
      contactId: providerContactId,
      segmentId,
    });
    if (
      segment.error &&
      !["not_found", "validation_error"].includes(segment.error.name)
    ) {
      throw new Error(segment.error.message);
    }
  }

  return { providerContactId };
}

export async function confirmNewsletterSubscription({
  subscriberId,
  token,
}) {
  if (!subscriberId || !token) return { status: "invalid" };
  const ref = adminDb.collection("newsletter_subscribers").doc(subscriberId);
  const now = new Date();
  const result = await adminDb.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists) return { status: "invalid" };
    const subscriber = snapshot.data();

    if (subscriber.status === "subscribed") {
      return { status: "already-confirmed", subscriber };
    }

    const expiresAt =
      subscriber.confirmationExpiresAt?.toDate?.() ||
      subscriber.confirmationExpiresAt;
    if (!expiresAt || new Date(expiresAt) < now) {
      return { status: "expired" };
    }
    if (subscriber.confirmationTokenHash !== hashOpaqueToken(token)) {
      return { status: "invalid" };
    }

    transaction.update(ref, {
      status: "subscribed",
      confirmedAt: now,
      resubscribedAt: subscriber.unsubscribedAt ? now : null,
      confirmationTokenHash: null,
      confirmationVersion: null,
      confirmationExpiresAt: null,
      unsubscribedAt: null,
      updatedAt: now,
    });
    transaction.create(newsletterEventRef(), auditEvent({
      subscriberId,
      eventType: subscriber.unsubscribedAt ? "resubscribed" : "confirmed",
      source: subscriber.source,
      occurredAt: now,
    }));
    return { status: "confirmed", subscriber };
  });

  if (!["confirmed", "already-confirmed"].includes(result.status)) {
    return { status: result.status };
  }

  const subscriber = result.subscriber;
  const preferencesToken = createSignedActionToken(
    subscriberId,
    subscriber.actionTokenVersion || 1
  );
  if (result.status === "already-confirmed") {
    return { status: result.status, preferencesToken };
  }

  try {
    const provider = await syncResendContact(
      { ...subscriber, status: "subscribed" },
      "opt_in"
    );
    if (provider.providerContactId) {
      await ref.update({
        providerContactId: provider.providerContactId,
        providerSyncedAt: new Date(),
      });
    }
  } catch (error) {
    await ref.update({
      providerSyncError: String(error.message || "contact_sync_failed").slice(
        0,
        200
      ),
      providerSyncPending: true,
      updatedAt: new Date(),
    });
  }

  return {
    status: "confirmed",
    preferencesToken,
  };
}

export async function getNewsletterPreferences(token) {
  const action = verifySignedActionToken(token);
  if (!action) return null;
  const ref = adminDb.collection("newsletter_subscribers").doc(action.sub);
  const snapshot = await ref.get();
  if (!snapshot.exists) return null;
  const subscriber = snapshot.data();
  if (Number(subscriber.actionTokenVersion || 1) !== Number(action.ver)) {
    return null;
  }
  return {
    id: snapshot.id,
    normalizedEmail: subscriber.normalizedEmail,
    status: subscriber.status,
    topics: subscriber.topics || {},
  };
}

export async function updateNewsletterPreferences({
  token,
  topics,
  unsubscribe = false,
}) {
  const action = verifySignedActionToken(token);
  if (!action) return { status: "invalid" };
  const ref = adminDb.collection("newsletter_subscribers").doc(action.sub);
  const snapshot = await ref.get();
  if (!snapshot.exists) return { status: "invalid" };
  const subscriber = snapshot.data();
  if (Number(subscriber.actionTokenVersion || 1) !== Number(action.ver)) {
    return { status: "invalid" };
  }
  if (subscriber.status !== "subscribed") {
    return { status: "invalid" };
  }

  const now = new Date();
  const nextTopics = {
    newsletter: unsubscribe ? false : topics?.newsletter !== false,
    newPackages: unsubscribe ? false : topics?.newPackages === true,
    promotions: unsubscribe ? false : topics?.promotions === true,
  };
  const shouldUnsubscribe = unsubscribe || !Object.values(nextTopics).some(Boolean);
  const nextVersion = shouldUnsubscribe
    ? Number(subscriber.actionTokenVersion || 1) + 1
    : Number(subscriber.actionTokenVersion || 1);

  await ref.update({
    topics: nextTopics,
    status: shouldUnsubscribe ? "unsubscribed" : "subscribed",
    unsubscribedAt: shouldUnsubscribe ? now : null,
    actionTokenVersion: nextVersion,
    updatedAt: now,
  });
  await newsletterEventRef().set(auditEvent({
    subscriberId: snapshot.id,
    eventType: shouldUnsubscribe ? "unsubscribed" : "preferences_updated",
    source: "preferences",
    occurredAt: now,
  }));

  try {
    await syncResendContact(
      { ...subscriber, topics: nextTopics },
      shouldUnsubscribe ? "opt_out" : "opt_in"
    );
  } catch (error) {
    await ref.update({
      providerSyncPending: true,
      providerSyncError: String(error.message || "contact_sync_failed").slice(
        0,
        200
      ),
      updatedAt: new Date(),
    });
  }

  return {
    status: shouldUnsubscribe ? "unsubscribed" : "updated",
  };
}

export async function suppressNewsletterSubscriber({
  email,
  status,
  providerEventId,
}) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return false;
  const allowed = new Set(["bounced", "complained", "suppressed"]);
  if (!allowed.has(status)) return false;

  const ref = subscriberRefForEmail(normalizedEmail);
  const snapshot = await ref.get();
  if (!snapshot.exists) return false;
  const subscriber = snapshot.data();
  const now = new Date();
  await ref.update({
    status,
    topics: { newsletter: false, newPackages: false, promotions: false },
    actionTokenVersion: Number(subscriber.actionTokenVersion || 1) + 1,
    bounceCount:
      status === "bounced"
        ? Number(subscriber.bounceCount || 0) + 1
        : Number(subscriber.bounceCount || 0),
    complaintAt: status === "complained" ? now : subscriber.complaintAt || null,
    updatedAt: now,
  });
  await newsletterEventRef().set(auditEvent({
    subscriberId: snapshot.id,
    eventType: status,
    providerEventId: providerEventId || null,
    occurredAt: now,
  }));
  return true;
}

export async function syncNewsletterContactEvent({
  email,
  contactId,
  unsubscribed,
  deleted = false,
  providerEventId,
}) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return false;
  const ref = subscriberRefForEmail(normalizedEmail);
  const snapshot = await ref.get();
  if (!snapshot.exists) return false;
  const subscriber = snapshot.data();
  const now = new Date();

  const update = {
    providerContactId: deleted ? null : contactId || subscriber.providerContactId,
    providerSyncedAt: now,
    providerSyncPending: deleted,
    updatedAt: now,
  };
  if (unsubscribed === true) {
    update.status = "unsubscribed";
    update.unsubscribedAt = now;
    update.topics = {
      newsletter: false,
      newPackages: false,
      promotions: false,
    };
    update.actionTokenVersion = Number(subscriber.actionTokenVersion || 1) + 1;
  }
  await ref.update(update);

  if (unsubscribed === true || deleted) {
    await newsletterEventRef().set(auditEvent({
      subscriberId: snapshot.id,
      eventType: unsubscribed === true ? "unsubscribed" : "provider_contact_deleted",
      source: "provider_webhook",
      providerEventId: providerEventId || null,
      occurredAt: now,
    }));
  }
  return true;
}

export async function resendPendingNewsletterConfirmation(
  subscriberId,
  source = "admin"
) {
  const ref = adminDb.collection("newsletter_subscribers").doc(subscriberId);
  const snapshot = await ref.get();
  if (!snapshot.exists || snapshot.data().status !== "pending") {
    return { sent: false };
  }
  const subscriber = snapshot.data();
  const confirmationVersion = createNewsletterConfirmationVersion();
  const token = createNewsletterConfirmationToken(
    snapshot.id,
    confirmationVersion
  );
  const tokenHash = hashOpaqueToken(token);
  const now = new Date();
  await ref.update({
    confirmationTokenHash: tokenHash,
    confirmationVersion,
    confirmationExpiresAt: new Date(now.getTime() + CONFIRMATION_TTL_MS),
    requestedAt: now,
    updatedAt: now,
  });
  await enqueueEmailEvent({
    type: "newsletter.confirm",
    eventId: tokenHash.slice(0, 24),
    recipient: subscriber.normalizedEmail,
    data: { subscriberId: snapshot.id, confirmationVersion },
  });
  await newsletterEventRef().set(auditEvent({
    subscriberId: snapshot.id,
    eventType: "confirmation_sent",
    source,
    occurredAt: now,
  }));
  return { sent: true };
}

export async function requestNewsletterConfirmationResend({
  email,
  ipAddress,
  honeypot = "",
}) {
  if (honeypot) return NEWSLETTER_GENERIC_RESPONSE;
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return NEWSLETTER_GENERIC_RESPONSE;
  const fingerprint = newsletterFingerprint(
    ipAddress,
    normalizedEmail,
    "confirmation-resend"
  );
  const allowed = await consumeNewsletterRateLimit(fingerprint);
  if (!allowed) return NEWSLETTER_GENERIC_RESPONSE;
  const ref = subscriberRefForEmail(normalizedEmail);
  await resendPendingNewsletterConfirmation(ref.id, "confirmation_resend");
  return NEWSLETTER_GENERIC_RESPONSE;
}

export async function manuallySuppressNewsletterSubscriber(subscriberId) {
  const ref = adminDb.collection("newsletter_subscribers").doc(subscriberId);
  const snapshot = await ref.get();
  if (!snapshot.exists) return false;
  const subscriber = snapshot.data();
  const now = new Date();
  await ref.update({
    status: "suppressed",
    topics: { newsletter: false, newPackages: false, promotions: false },
    actionTokenVersion: Number(subscriber.actionTokenVersion || 1) + 1,
    updatedAt: now,
  });
  await newsletterEventRef().set(auditEvent({
    subscriberId,
    eventType: "suppressed",
    source: "admin",
    occurredAt: now,
  }));
  try {
    await syncResendContact(
      {
        ...subscriber,
        topics: { newsletter: false, newPackages: false, promotions: false },
      },
      "opt_out"
    );
  } catch (error) {
    await ref.update({
      providerSyncPending: true,
      providerSyncError: String(error.message || "contact_sync_failed").slice(
        0,
        200
      ),
      updatedAt: new Date(),
    });
  }
  return true;
}

export async function anonymizeNewsletterSubscriber(subscriberId) {
  const ref = adminDb.collection("newsletter_subscribers").doc(subscriberId);
  const snapshot = await ref.get();
  if (!snapshot.exists) return false;
  const subscriber = snapshot.data();

  if (
    process.env.RESEND_API_KEY &&
    process.env.EMAIL_DISABLE_SEND !== "true" &&
    subscriber.providerContactId
  ) {
    const removed = await getResend().contacts.remove({
      id: subscriber.providerContactId,
    });
    if (
      removed.error &&
      !["not_found", "not_found_error"].includes(removed.error.name)
    ) {
      throw new Error(removed.error.message || "Could not delete provider contact");
    }
  }

  const now = new Date();
  await ref.set({
    normalizedEmail: null,
    emailHash: subscriberId,
    userId: null,
    status: "suppressed",
    topics: { newsletter: false, newPackages: false, promotions: false },
    consentText: null,
    confirmationTokenHash: null,
    confirmationVersion: null,
    confirmationExpiresAt: null,
    providerContactId: null,
    providerSyncPending: false,
    providerSyncError: null,
    actionTokenVersion: Number(subscriber.actionTokenVersion || 1) + 1,
    anonymizedAt: now,
    updatedAt: now,
  }, { merge: true });
  await newsletterEventRef().set(auditEvent({
    subscriberId,
    eventType: "anonymized",
    source: "admin",
    occurredAt: now,
  }));
  return true;
}

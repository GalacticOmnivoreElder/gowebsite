import { adminDb } from "@/lib/firebase-admin";
import { getEmailPreferenceDecision } from "./preferences";
import { sendEmailJob } from "./send-email";
import {
  makeEmailJobId,
  makeIdempotencyKey,
  normalizeEmail,
  hashValue,
} from "./utils";
import { validateEmailEvent } from "./events";

const MAX_ATTEMPTS = 5;
const LEASE_MS = 5 * 60 * 1000;
const INDEX_FALLBACK_SCAN_LIMIT = 500;

function backoffMs(attempt) {
  return Math.min(6 * 60 * 60 * 1000, 30_000 * 2 ** Math.max(0, attempt - 1));
}

export function isMissingFirestoreIndexError(error) {
  return (
    Number(error?.code) === 9 &&
    /query requires an index/i.test(
      `${error?.message || ""} ${error?.details || ""}`
    )
  );
}

function firestoreDate(value) {
  return value?.toDate?.() || value || null;
}

function logIndexFallback(query) {
  console.warn(
    JSON.stringify({
      level: "warning",
      message: "email_outbox_index_fallback",
      query,
      scanLimit: INDEX_FALLBACK_SCAN_LIMIT,
    })
  );
}

async function loadDuePendingJobs(now, limit) {
  const collection = adminDb.collection("email_outbox");
  try {
    return await collection
      .where("status", "==", "pending")
      .where("nextAttemptAt", "<=", now)
      .orderBy("nextAttemptAt", "asc")
      .limit(limit)
      .get();
  } catch (error) {
    if (!isMissingFirestoreIndexError(error)) throw error;
    logIndexFallback("pending_nextAttemptAt");
    const fallback = await collection
      .where("status", "==", "pending")
      .limit(INDEX_FALLBACK_SCAN_LIMIT)
      .get();
    const docs = fallback.docs
      .filter((doc) => {
        const nextAttemptAt = firestoreDate(doc.data().nextAttemptAt);
        return !nextAttemptAt || new Date(nextAttemptAt) <= now;
      })
      .sort((left, right) => {
        const leftAt = firestoreDate(left.data().nextAttemptAt);
        const rightAt = firestoreDate(right.data().nextAttemptAt);
        return new Date(leftAt || 0) - new Date(rightAt || 0);
      })
      .slice(0, limit);
    return { docs, empty: docs.length === 0, size: docs.length };
  }
}

async function loadExpiredProcessingJobs(now, limit) {
  const collection = adminDb.collection("email_outbox");
  try {
    return await collection
      .where("status", "==", "processing")
      .where("leaseUntil", "<=", now)
      .limit(limit)
      .get();
  } catch (error) {
    if (!isMissingFirestoreIndexError(error)) throw error;
    logIndexFallback("processing_leaseUntil");
    const fallback = await collection
      .where("status", "==", "processing")
      .limit(INDEX_FALLBACK_SCAN_LIMIT)
      .get();
    const docs = fallback.docs
      .filter((doc) => {
        const leaseUntil = firestoreDate(doc.data().leaseUntil);
        return leaseUntil && new Date(leaseUntil) <= now;
      })
      .slice(0, limit);
    return { docs, empty: docs.length === 0, size: docs.length };
  }
}

export function createEmailOutboxJob(event, now = new Date()) {
  const validated = validateEmailEvent(event);
  const recipient = normalizeEmail(validated.recipient);
  if (!recipient) throw new Error("A valid email recipient is required");

  const id = makeEmailJobId({
    type: validated.type,
    eventId: validated.eventId,
    userId: validated.userId,
    recipient,
  });

  return {
    id,
    eventType: validated.type,
    eventId: validated.eventId,
    userId: validated.userId || null,
    recipient,
    templateData: validated.data,
    category: validated.category,
    status: "pending",
    attempts: 0,
    providerEmailId: null,
    idempotencyKey: makeIdempotencyKey({
      type: validated.type,
      eventId: validated.eventId,
      userId: validated.userId,
      recipient,
    }),
    scheduledFor:
      validated.scheduledFor instanceof Date ? validated.scheduledFor : now,
    nextAttemptAt:
      validated.scheduledFor instanceof Date ? validated.scheduledFor : now,
    lastAttemptAt: null,
    lastErrorCode: null,
    createdAt: now,
    updatedAt: now,
    sentAt: null,
  };
}

export async function enqueueEmailEvent(event) {
  const job = createEmailOutboxJob(event);
  const ref = adminDb.collection("email_outbox").doc(job.id);

  const created = await adminDb.runTransaction(async (transaction) => {
    const existing = await transaction.get(ref);
    if (existing.exists) return false;
    transaction.create(ref, job);
    return true;
  });

  return { id: job.id, created };
}

export function addEmailEventToBatch(batch, event, now = new Date()) {
  const job = createEmailOutboxJob(event, now);
  const ref = adminDb.collection("email_outbox").doc(job.id);
  batch.create(ref, job);
  return { id: job.id, created: true };
}

export async function enqueueEmailEvents(events = []) {
  const results = [];
  for (const event of events) {
    if (!event?.recipient) continue;
    results.push(await enqueueEmailEvent(event));
  }
  return results;
}

export async function cancelPendingEmailEvents({ userId, eventType, reason }) {
  if (!userId || !eventType) return 0;
  const snapshot = await adminDb
    .collection("email_outbox")
    .where("userId", "==", userId)
    .where("eventType", "==", eventType)
    .where("status", "==", "pending")
    .limit(100)
    .get();
  if (snapshot.empty) return 0;
  const batch = adminDb.batch();
  snapshot.docs.forEach((doc) => {
    batch.update(doc.ref, {
      status: "suppressed",
      suppressionReason: reason || "cancelled",
      updatedAt: new Date(),
    });
  });
  await batch.commit();
  return snapshot.size;
}

async function loadPreferenceContext(job) {
  let userData = {};
  let newsletterSubscriber = null;
  let emailSuppression = null;

  if (job.userId) {
    const userDoc = await adminDb.collection("users").doc(job.userId).get();
    if (userDoc.exists) userData = userDoc.data();
  }

  if (job.category === "marketing") {
    const subscriberQuery = await adminDb
      .collection("newsletter_subscribers")
      .where("normalizedEmail", "==", job.recipient)
      .limit(1)
      .get();
    if (!subscriberQuery.empty) {
      newsletterSubscriber = subscriberQuery.docs[0].data();
    }
  }

  if (job.category !== "essential" && job.category !== "admin") {
    const suppression = await adminDb
      .collection("email_suppressions")
      .doc(hashValue(job.recipient))
      .get();
    if (suppression.exists) emailSuppression = suppression.data();
  }

  return { userData, newsletterSubscriber, emailSuppression };
}

async function claimJob(ref) {
  return adminDb.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists) return null;
    const job = snapshot.data();
    const now = new Date();
    const nextAttempt = job.nextAttemptAt?.toDate?.() || job.nextAttemptAt;

    if (
      job.status !== "pending" ||
      (nextAttempt && new Date(nextAttempt) > now) ||
      Number(job.attempts || 0) >= MAX_ATTEMPTS
    ) {
      return null;
    }

    transaction.update(ref, {
      status: "processing",
      attempts: Number(job.attempts || 0) + 1,
      lastAttemptAt: now,
      leaseUntil: new Date(now.getTime() + LEASE_MS),
      updatedAt: now,
    });

    return {
      id: snapshot.id,
      ...job,
      attempts: Number(job.attempts || 0) + 1,
    };
  });
}

async function finishJob(ref, update) {
  const now = new Date();
  const terminal = ["sent", "failed", "suppressed"].includes(update.status);
  await ref.update({
    ...update,
    updatedAt: now,
    leaseUntil: null,
    ...(terminal
      ? { expiresAt: new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000) }
      : {}),
  });
}

export async function processEmailOutbox({ limit = 25 } = {}) {
  const now = new Date();
  const boundedLimit = Math.min(Math.max(Number(limit) || 25, 1), 100);
  const snapshot = await loadDuePendingJobs(now, boundedLimit);

  const summary = { claimed: 0, sent: 0, failed: 0, suppressed: 0 };

  for (const candidate of snapshot.docs) {
    const job = await claimJob(candidate.ref);
    if (!job) continue;
    summary.claimed += 1;

    try {
      const context = await loadPreferenceContext(job);
      const decision = getEmailPreferenceDecision({
        eventType: job.eventType,
        ...context,
      });
      if (
        job.eventType === "onboarding.incomplete_reminder" &&
        context.userData?.onboardingCompleted === true
      ) {
        await finishJob(candidate.ref, {
          status: "suppressed",
          suppressionReason: "onboarding_completed",
        });
        summary.suppressed += 1;
        continue;
      }
      if (
        job.eventType === "billing.renewal_reminder" &&
        context.userData?.willRenew !== true
      ) {
        await finishJob(candidate.ref, {
          status: "suppressed",
          suppressionReason: "subscription_not_renewing",
        });
        summary.suppressed += 1;
        continue;
      }
      if (
        job.eventType === "billing.access_expiring" &&
        context.userData?.willRenew === true
      ) {
        await finishJob(candidate.ref, {
          status: "suppressed",
          suppressionReason: "subscription_reactivated",
        });
        summary.suppressed += 1;
        continue;
      }
      if (!decision.allowed) {
        await finishJob(candidate.ref, {
          status: "suppressed",
          suppressionReason: decision.reason,
        });
        summary.suppressed += 1;
        continue;
      }

      const result = await sendEmailJob(job);
      await finishJob(candidate.ref, {
        status: result.status,
        providerEmailId: result.providerEmailId || null,
        suppressionReason: result.reason || null,
        sentAt: result.status === "sent" ? new Date() : null,
      });
      summary[result.status === "sent" ? "sent" : "suppressed"] += 1;
    } catch (error) {
      const permanent =
        error.permanent === true || Number(job.attempts) >= MAX_ATTEMPTS;
      await finishJob(candidate.ref, {
        status: permanent ? "failed" : "pending",
        lastErrorCode: error.code || "send_failed",
        nextAttemptAt: permanent
          ? null
          : new Date(Date.now() + backoffMs(job.attempts)),
      });
      summary.failed += 1;
    }
  }

  return summary;
}

export async function requeueExpiredEmailJobs({ limit = 50 } = {}) {
  const boundedLimit = Math.min(Math.max(Number(limit) || 50, 1), 100);
  const snapshot = await loadExpiredProcessingJobs(new Date(), boundedLimit);
  const batch = adminDb.batch();
  snapshot.docs.forEach((doc) => {
    batch.update(doc.ref, {
      status: "pending",
      leaseUntil: null,
      nextAttemptAt: new Date(),
      updatedAt: new Date(),
    });
  });
  if (!snapshot.empty) await batch.commit();
  return snapshot.size;
}

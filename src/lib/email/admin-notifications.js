import { adminDb } from "@/lib/firebase-admin";
import { enqueueEmailEvents } from "./outbox";
import { normalizeEmail } from "./utils";

export function getAdminNotificationRecipients() {
  return [
    ...new Set(
      String(process.env.ADMIN_NOTIFICATION_EMAILS || "")
        .split(",")
        .map(normalizeEmail)
        .filter(Boolean)
    ),
  ];
}

export async function enqueueAdminEmailEvent({ type, eventId, data }) {
  const recipients = getAdminNotificationRecipients();
  if (!recipients.length) return [];
  return enqueueEmailEvents(
    recipients.map((recipient) => ({
      type,
      eventId,
      recipient,
      data,
    }))
  );
}

export async function enqueueDailyEmailFailureDigest(now = new Date()) {
  const recipients = getAdminNotificationRecipients();
  if (!recipients.length) return { queued: 0, failedCount: 0 };
  const dayStart = new Date(now);
  dayStart.setUTCHours(0, 0, 0, 0);
  const snapshot = await adminDb
    .collection("email_outbox")
    .where("status", "==", "failed")
    .where("updatedAt", ">=", dayStart)
    .limit(100)
    .get();
  if (snapshot.empty) return { queued: 0, failedCount: 0 };

  const failedCount = snapshot.size;
  const threshold = Math.max(
    1,
    Number(process.env.EMAIL_FAILURE_SPIKE_THRESHOLD) || 5
  );
  const results = await enqueueAdminEmailEvent({
    type: "admin.email_failure_digest",
    eventId: dayStart.toISOString().slice(0, 10),
    data: {
      subject:
        failedCount >= threshold
          ? `Email delivery failure spike: ${failedCount} jobs`
          : `Daily email failure digest: ${failedCount} job${failedCount === 1 ? "" : "s"}`,
      heading: "Email delivery failures",
      message: `${failedCount} email job${failedCount === 1 ? "" : "s"} reached a final failed state today. Review delivery health and suppression records.`,
      ctaLabel: "Open newsletter dashboard",
      ctaUrl: `${process.env.NEXT_PUBLIC_SITE_URL || "https://www.galacticomnivore.com"}/admin/newsletter`,
    },
  });
  return {
    queued: results.filter((result) => result.created).length,
    failedCount,
  };
}

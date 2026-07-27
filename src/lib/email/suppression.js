import { adminDb } from "@/lib/firebase-admin";
import { hashValue, normalizeEmail } from "./utils";

const SUPPRESSION_STATUSES = new Set([
  "bounced",
  "complained",
  "suppressed",
]);

export async function suppressEmailAddress({
  email,
  status,
  providerEventId = null,
}) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail || !SUPPRESSION_STATUSES.has(status)) return false;
  const now = new Date();
  await adminDb
    .collection("email_suppressions")
    .doc(hashValue(normalizedEmail))
    .set(
      {
        status,
        providerEventId,
        firstSeenAt: now,
        lastSeenAt: now,
      },
      { merge: true }
    );
  return true;
}

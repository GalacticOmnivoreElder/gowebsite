import { NextResponse } from "next/server";
import { getRequestUser } from "@/lib/auth-utils";
import { adminDb } from "@/lib/firebase-admin";
import { hashValue } from "@/lib/email/utils";

const COOLDOWN_MS = 60_000;
const DAILY_LIMIT = 5;

export async function POST(request) {
  const user = await getRequestUser(request);
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }
  if (user.claims?.email_verified === true) {
    return NextResponse.json({ allowed: false, alreadyVerified: true });
  }

  const now = new Date();
  const day = now.toISOString().slice(0, 10);
  const ref = adminDb
    .collection("email_action_rate_limits")
    .doc(hashValue(`verify-email:${user.uid}`));
  const result = await adminDb.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    const data = snapshot.exists ? snapshot.data() : {};
    const lastAttempt = data.lastAttemptAt?.toDate?.() || data.lastAttemptAt;
    if (
      lastAttempt &&
      now.getTime() - new Date(lastAttempt).getTime() < COOLDOWN_MS
    ) {
      return { allowed: false, retryAfter: 60 };
    }
    const count = data.day === day ? Number(data.count || 0) : 0;
    if (count >= DAILY_LIMIT) {
      return { allowed: false, retryAfter: 24 * 60 * 60 };
    }
    transaction.set(
      ref,
      {
        action: "verify_email",
        userId: user.uid,
        day,
        count: count + 1,
        lastAttemptAt: now,
        expiresAt: new Date(now.getTime() + 48 * 60 * 60 * 1000),
      },
      { merge: true }
    );
    return { allowed: true };
  });
  return NextResponse.json(result, {
    status: result.allowed || result.alreadyVerified ? 200 : 429,
  });
}

import { NextResponse } from "next/server";
import { getRequestUser } from "@/lib/auth-utils";
import { adminDb } from "@/lib/firebase-admin";
import { hashValue } from "@/lib/email/utils";
import { sendVerificationEmail } from "@/lib/auth-verification";
import { safeInternalRedirect } from "@/lib/safe-redirect";

const COOLDOWN_MS = 60_000;
const DAILY_LIMIT = 5;

export async function POST(request) {
  try {
    const user = await getRequestUser(request);
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    if (user.claims?.email_verified === true) {
      return NextResponse.json({ allowed: false, alreadyVerified: true });
    }

    const body = await request.json().catch(() => ({}));
    const redirect = safeInternalRedirect(
      body && typeof body === "object" ? body.redirect : null
    );
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

    if (!result.allowed) {
      return NextResponse.json(result, { status: 429 });
    }

    const delivery = await sendVerificationEmail({
      uid: user.uid,
      email: user.email,
      redirect,
    });

    if (delivery.skipped) {
      return NextResponse.json({
        allowed: false,
        alreadyVerified: true,
      });
    }

    return NextResponse.json({ allowed: true, sent: true });
  } catch (error) {
    console.error("Could not deliver verification email:", {
      code: error?.code || "verification_delivery_failed",
    });
    return NextResponse.json(
      {
        allowed: false,
        error: "The verification email could not be sent yet. Please try again later.",
        code: "verification_delivery_failed",
      },
      { status: 503 }
    );
  }
}

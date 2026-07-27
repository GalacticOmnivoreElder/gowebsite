import { NextResponse } from "next/server";
import { getRequestUser } from "@/lib/auth-utils";
import {
  consumeNewsletterRateLimit,
  newsletterFingerprint,
  requestNewsletterSubscription,
} from "@/lib/email/newsletter";

function requestIp(request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const fingerprint = newsletterFingerprint(requestIp(request), body.email);
    const allowed = await consumeNewsletterRateLimit(fingerprint);
    if (!allowed) {
      return NextResponse.json(
        { error: "Please wait before trying again." },
        { status: 429 }
      );
    }

    const user = await getRequestUser(request).catch(() => null);
    const result = await requestNewsletterSubscription({
      email: body.email,
      source: body.source,
      consent: body.consent,
      honeypot: body.company,
      userId: user?.uid || null,
      verifiedUserEmail: user?.email || null,
    });
    return NextResponse.json(result);
  } catch (error) {
    const status = ["invalid_email", "consent_required"].includes(error.code)
      ? 400
      : 500;
    return NextResponse.json(
      {
        error:
          status === 400
            ? error.message
            : "Newsletter signup is temporarily unavailable.",
      },
      { status }
    );
  }
}

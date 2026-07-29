import { NextResponse } from "next/server";
import {
  NEWSLETTER_GENERIC_RESPONSE,
  requestNewsletterConfirmationResend,
} from "@/lib/email/newsletter";
import {
  isNewsletterEnabled,
  newsletterUnavailableResponse,
} from "@/lib/newsletter-feature";

function requestIp(request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

export async function POST(request) {
  if (!isNewsletterEnabled()) return newsletterUnavailableResponse();
  const body = await request.json().catch(() => ({}));
  await requestNewsletterConfirmationResend({
    email: body.email,
    ipAddress: requestIp(request),
    honeypot: body.company,
  }).catch(() => NEWSLETTER_GENERIC_RESPONSE);
  return NextResponse.json(NEWSLETTER_GENERIC_RESPONSE);
}

import { NextResponse } from "next/server";
import {
  getNewsletterPreferences,
  updateNewsletterPreferences,
} from "@/lib/email/newsletter";
import { maskEmail } from "@/lib/email/utils";
import {
  isNewsletterEnabled,
  newsletterUnavailableResponse,
} from "@/lib/newsletter-feature";

export async function GET(request) {
  if (!isNewsletterEnabled()) return newsletterUnavailableResponse();
  const token = new URL(request.url).searchParams.get("token");
  const preferences = await getNewsletterPreferences(token);
  if (!preferences) {
    return NextResponse.json(
      { error: "This preferences link is invalid or expired." },
      { status: 400 }
    );
  }
  return NextResponse.json({
    email: maskEmail(preferences.normalizedEmail),
    status: preferences.status,
    topics: preferences.topics,
  });
}

export async function POST(request) {
  if (!isNewsletterEnabled()) return newsletterUnavailableResponse();
  const body = await request.json().catch(() => ({}));
  const result = await updateNewsletterPreferences({
    token: body.token,
    topics: body.topics,
    unsubscribe: body.unsubscribe === true,
  });
  if (result.status === "invalid") {
    return NextResponse.json(
      { error: "This preferences link is invalid or expired." },
      { status: 400 }
    );
  }
  return NextResponse.json(result);
}

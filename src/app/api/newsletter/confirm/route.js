import { NextResponse } from "next/server";
import { confirmNewsletterSubscription } from "@/lib/email/newsletter";
import { absoluteSiteUrl } from "@/lib/email/utils";
import {
  isNewsletterEnabled,
  newsletterUnavailableResponse,
} from "@/lib/newsletter-feature";

export async function GET(request) {
  if (!isNewsletterEnabled()) return newsletterUnavailableResponse();
  const { searchParams } = new URL(request.url);
  const result = await confirmNewsletterSubscription({
    subscriberId: searchParams.get("subscriber"),
    token: searchParams.get("token"),
  });
  const target = new URL("/newsletter/confirmed", absoluteSiteUrl("/"));
  target.searchParams.set("status", result.status);
  if (result.preferencesToken) {
    target.searchParams.set("preferences", result.preferencesToken);
  }
  return NextResponse.redirect(target);
}

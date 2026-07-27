import { NextResponse } from "next/server";
import {
  getNewsletterPreferences,
  updateNewsletterPreferences,
} from "@/lib/email/newsletter";
import { absoluteSiteUrl } from "@/lib/email/utils";

export async function GET(request) {
  const token = new URL(request.url).searchParams.get("token") || "";
  const preferences = await getNewsletterPreferences(token);
  const target = new URL("/newsletter/preferences", absoluteSiteUrl("/"));
  if (preferences) {
    target.searchParams.set("token", token);
    target.searchParams.set("unsubscribe", "1");
  }
  return NextResponse.redirect(target);
}

export async function POST(request) {
  const contentType = request.headers.get("content-type") || "";
  const token = new URL(request.url).searchParams.get("token");
  const body = contentType.includes("application/json")
    ? await request.json().catch(() => ({}))
    : Object.fromEntries(
        await request.formData().catch(() => new FormData())
      );
  const result = await updateNewsletterPreferences({
    token: token || body.token,
    unsubscribe: true,
    topics: {},
  });
  if (result.status === "invalid") {
    return NextResponse.json({ error: "Invalid unsubscribe link" }, { status: 400 });
  }
  return NextResponse.json({ success: true });
}

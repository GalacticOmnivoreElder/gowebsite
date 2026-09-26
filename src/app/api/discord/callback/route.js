import { NextResponse } from "next/server";
import { requireDiscordConfig } from "@/lib/discord-api";
import { DISCORD_COOKIE, captureDiscordCode } from "@/lib/discord";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request) {
  let config;
  try { config = requireDiscordConfig(); }
  catch { return new NextResponse("Discord connection is not configured.", { status: 503 }); }
  const url = new URL(request.url);
  const destination = new URL("/discord", config.redirectUri);
  let result = "failed";
  if (url.searchParams.get("error")) result = "cancelled";
  else {
    try {
      await captureDiscordCode(url.searchParams.get("state"), request.cookies.get(DISCORD_COOKIE)?.value,
        url.searchParams.get("code"));
      result = "complete";
    } catch { /* Fail closed; the UI offers a new connection attempt. */ }
  }
  destination.searchParams.set("discord", result);
  return NextResponse.redirect(destination, { status: 303, headers: {
    "Cache-Control": "no-store", "Referrer-Policy": "no-referrer",
  } });
}

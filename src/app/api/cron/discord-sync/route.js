import { NextResponse } from "next/server";
import { processDiscordSyncs } from "@/lib/discord";
import { getDiscordConfig } from "@/lib/discord-api";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request) {
  if (!process.env.CRON_SECRET || request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!getDiscordConfig().enabled) return NextResponse.json({ skipped: "disabled" });
  try { return NextResponse.json(await processDiscordSyncs()); }
  catch { return NextResponse.json({ error: "Discord synchronization failed" }, { status: 500 }); }
}

export const GET = POST;

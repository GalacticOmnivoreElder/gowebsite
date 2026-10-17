import { NextResponse } from "next/server";
import { getPublicAppetite } from "@/lib/community-build-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    return NextResponse.json(await getPublicAppetite(), {
      headers: { "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=600" },
    });
  } catch {
    return NextResponse.json({ configured: false, status: "unavailable", counts: null, total: 0 }, {
      status: 503,
      headers: { "Cache-Control": "public, max-age=30, s-maxage=60" },
    });
  }
}

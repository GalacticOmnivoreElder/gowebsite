import { getUpcomingGoEvents } from "@/lib/go-events-server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const payload = await getUpcomingGoEvents();
    return Response.json(payload, {
      headers: {
        "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=600",
      },
    });
  } catch (error) {
    console.error("GO Events calendar unavailable:", error);
    const status = error?.code === "GO_EVENTS_CALENDAR_NOT_CONFIGURED" ? 503 : error?.status || 502;
    return Response.json(
      {
        error: "GO Events are temporarily unavailable.",
        code: error?.code || "GO_EVENTS_UNAVAILABLE",
        events: [],
        nextEvent: null,
        timezone: "Europe/Belgrade",
        configured: false,
      },
      { status, headers: { "Cache-Control": "no-store" } }
    );
  }
}


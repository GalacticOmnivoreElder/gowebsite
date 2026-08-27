import { getUpcomingGoEvents, logGoEventsEnvDiagnostics } from "@/lib/go-events-server";

export const dynamic = "force-dynamic";

export async function GET() {
  const diagnostics = logGoEventsEnvDiagnostics("GET /api/go-events");
  try {
    const payload = await getUpcomingGoEvents();
    return Response.json(payload, {
      headers: {
        "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=600",
      },
    });
  } catch (error) {
    console.error("GO Events calendar unavailable:", error?.message || error, error);
    const status = error?.code === "GO_EVENTS_CALENDAR_NOT_CONFIGURED" ? 503 : error?.status || 502;
    return Response.json(
      {
        error: "GO Events are temporarily unavailable.",
        code: error?.code || "GO_EVENTS_UNAVAILABLE",
        detail: error?.message || null,
        events: [],
        nextEvent: null,
        timezone: "Europe/Belgrade",
        configured: false,
        debug: diagnostics,
      },
      { status, headers: { "Cache-Control": "no-store" } }
    );
  }
}


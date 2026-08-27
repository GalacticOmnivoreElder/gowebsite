import {
  getGoEventsEnvironmentDiagnostics,
  getSafeGoEventsError,
  logGoEventsDiagnostic,
} from "@/lib/go-events-diagnostics";
import { getUpcomingGoEvents } from "@/lib/go-events-server";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const startedAt = Date.now();
  const requestId =
    request?.headers?.get("x-vercel-id") ||
    request?.headers?.get("x-request-id") ||
    null;
  const configuration = getGoEventsEnvironmentDiagnostics();

  logGoEventsDiagnostic("info", "go_events.request.started", {
    route: "/api/go-events",
    requestId,
    configuration,
  });

  try {
    const payload = await getUpcomingGoEvents();
    logGoEventsDiagnostic("info", "go_events.request.completed", {
      route: "/api/go-events",
      requestId,
      durationMs: Date.now() - startedAt,
      eventCount: payload.events?.length || 0,
      configured: payload.configured === true,
    });
    return Response.json(payload, {
      headers: {
        "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=600",
      },
    });
  } catch (error) {
    logGoEventsDiagnostic("error", "go_events.request.failed", {
      route: "/api/go-events",
      requestId,
      durationMs: Date.now() - startedAt,
      error: getSafeGoEventsError(error),
      configuration,
    });
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

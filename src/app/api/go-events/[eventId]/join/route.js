import { getRequestUser } from "@/lib/auth-utils";
import {
  getCalendarEventForJoin,
  getJoinUrlFromCalendarEvent,
} from "@/lib/go-events-server";

export const dynamic = "force-dynamic";

function noStore() {
  return { "Cache-Control": "private, no-store" };
}

export async function POST(request, { params }) {
  try {
    const { eventId } = await params;
    const { event, source } = await getCalendarEventForJoin(eventId);
    const { access, joinUrl } = getJoinUrlFromCalendarEvent(event, source);

    if (!joinUrl) {
      return Response.json(
        { error: "This event does not have an available Google Meet link.", code: "GO_EVENTS_JOIN_UNAVAILABLE" },
        { status: 409, headers: noStore() }
      );
    }

    if (access === "members") {
      const user = await getRequestUser(request);
      if (!user) {
        return Response.json(
          { error: "Sign in to join this GO Community event.", code: "GO_EVENTS_AUTH_REQUIRED", signInUrl: "/login?returnTo=/events" },
          { status: 401, headers: noStore() }
        );
      }

      if (!user.activeMember) {
        return Response.json(
          { error: "An active GO Community subscription is required.", code: "GO_EVENTS_MEMBERSHIP_REQUIRED", membershipUrl: "/membership?reason=community-event" },
          { status: 403, headers: noStore() }
        );
      }
    }

    return Response.json({ joinUrl }, { headers: noStore() });
  } catch (error) {
    console.error("GO Events join request failed:", error);
    const status = error?.status || (error?.code === "GO_EVENTS_CALENDAR_NOT_CONFIGURED" ? 503 : 500);
    return Response.json(
      { error: "The event join link is temporarily unavailable.", code: error?.code || "GO_EVENTS_JOIN_FAILED" },
      { status, headers: noStore() }
    );
  }
}


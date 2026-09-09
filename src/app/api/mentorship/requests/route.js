export const dynamic = "force-dynamic";

import { getMentorshipDashboard, saveMentorshipRequest } from "@/lib/mentorship-service";
import { requireMentorshipUser, routeError } from "@/lib/mentorship-route";

export async function GET(request) {
  const gate = await requireMentorshipUser(request, "manage_active_mentorship");
  if (gate.response) return gate.response;
  try {
    const dashboard = await getMentorshipDashboard(gate.user);
    return Response.json({ requests: dashboard.requests }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return routeError(error, "Mentorship requests could not be loaded");
  }
}

export async function POST(request) {
  const gate = await requireMentorshipUser(request, "create_request");
  if (gate.response) return gate.response;
  try {
    const body = await request.json().catch(() => ({}));
    return Response.json(await saveMentorshipRequest({ user: gate.user, requestId: String(body.requestId || ""), input: body, mode: body.mode === "draft" ? "draft" : "submit" }), { status: body.mode === "draft" ? 200 : 201 });
  } catch (error) {
    return routeError(error, "Mentorship request could not be saved");
  }
}

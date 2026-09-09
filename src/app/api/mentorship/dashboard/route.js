export const dynamic = "force-dynamic";

import { getMentorshipDashboard } from "@/lib/mentorship-service";
import { requireMentorshipUser, routeError } from "@/lib/mentorship-route";

export async function GET(request) {
  const gate = await requireMentorshipUser(request, "manage_active_mentorship");
  if (gate.response) return gate.response;
  try {
    return Response.json(await getMentorshipDashboard(gate.user), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return routeError(error, "Mentorship dashboard could not be loaded");
  }
}

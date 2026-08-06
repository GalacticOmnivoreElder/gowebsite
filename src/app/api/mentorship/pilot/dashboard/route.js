export const dynamic = "force-dynamic";

import { getMentorshipPilotDashboard } from "@/lib/mentorship-pilot-service";
import { requirePilotUser, routeError } from "@/lib/mentorship-pilot-route";

export async function GET(request) {
  const gate = await requirePilotUser(request, "manage_active_mentorship");
  if (gate.response) return gate.response;
  try {
    return Response.json(await getMentorshipPilotDashboard(gate.user), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return routeError(error, "Mentorship dashboard could not be loaded");
  }
}

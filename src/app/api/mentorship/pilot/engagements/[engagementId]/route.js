export const dynamic = "force-dynamic";

import { updateMentorshipPilotEngagement } from "@/lib/mentorship-pilot-service";
import { requirePilotUser, routeError } from "@/lib/mentorship-pilot-route";

export async function PATCH(request, { params }) {
  const gate = await requirePilotUser(request, "manage_active_mentorship");
  if (gate.response) return gate.response;
  try {
    const body = await request.json().catch(() => ({}));
    const { engagementId } = await params;
    return Response.json(await updateMentorshipPilotEngagement({ user: gate.user, engagementId, action: String(body.action || ""), payload: body }));
  } catch (error) {
    return routeError(error, "Mentorship engagement could not be updated");
  }
}

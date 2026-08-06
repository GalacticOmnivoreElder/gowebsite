export const dynamic = "force-dynamic";

import { updateMentorshipPilotRequest } from "@/lib/mentorship-pilot-service";
import { requirePilotUser, routeError } from "@/lib/mentorship-pilot-route";

export async function PATCH(request, { params }) {
  const gate = await requirePilotUser(request, "manage_active_mentorship");
  if (gate.response) return gate.response;
  try {
    const body = await request.json().catch(() => ({}));
    const { requestId } = await params;
    return Response.json(await updateMentorshipPilotRequest({ user: gate.user, requestId, action: String(body.action || ""), message: body.message }));
  } catch (error) {
    return routeError(error, "Mentorship request could not be updated");
  }
}

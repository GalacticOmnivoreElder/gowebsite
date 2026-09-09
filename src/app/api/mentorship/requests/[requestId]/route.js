export const dynamic = "force-dynamic";

import { updateMentorshipRequest } from "@/lib/mentorship-service";
import { requireMentorshipUser, routeError } from "@/lib/mentorship-route";

export async function PATCH(request, { params }) {
  const gate = await requireMentorshipUser(request, "manage_active_mentorship");
  if (gate.response) return gate.response;
  try {
    const body = await request.json().catch(() => ({}));
    const { requestId } = await params;
    return Response.json(await updateMentorshipRequest({ user: gate.user, requestId, action: String(body.action || ""), message: body.message }));
  } catch (error) {
    return routeError(error, "Mentorship request could not be updated");
  }
}

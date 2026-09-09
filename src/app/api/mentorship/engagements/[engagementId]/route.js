export const dynamic = "force-dynamic";

import { updateMentorshipEngagement } from "@/lib/mentorship-service";
import { requireMentorshipUser, routeError } from "@/lib/mentorship-route";

export async function PATCH(request, { params }) {
  const gate = await requireMentorshipUser(request, "manage_active_mentorship");
  if (gate.response) return gate.response;
  try {
    const body = await request.json().catch(() => ({}));
    const { engagementId } = await params;
    return Response.json(await updateMentorshipEngagement({ user: gate.user, engagementId, action: String(body.action || ""), payload: body }));
  } catch (error) {
    return routeError(error, "Mentorship engagement could not be updated");
  }
}

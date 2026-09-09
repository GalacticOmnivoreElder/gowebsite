export const dynamic = "force-dynamic";

import { respondToMentorApplication } from "@/lib/mentorship-service";
import { requireMentorshipUser, routeError } from "@/lib/mentorship-route";

export async function PATCH(request, { params }) {
  const gate = await requireMentorshipUser(request, "manage_active_mentorship");
  if (gate.response) return gate.response;
  try {
    const body = await request.json().catch(() => ({}));
    const { applicationId } = await params;
    return Response.json(await respondToMentorApplication({ user: gate.user, applicationId, action: String(body.action || ""), response: body.response }));
  } catch (error) {
    return routeError(error, "Mentor application could not be updated");
  }
}

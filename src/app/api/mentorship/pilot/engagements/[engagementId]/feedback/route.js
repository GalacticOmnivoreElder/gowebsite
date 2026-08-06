export const dynamic = "force-dynamic";

import { submitMentorshipClosingFeedback } from "@/lib/mentorship-pilot-service";
import { requirePilotUser, routeError } from "@/lib/mentorship-pilot-route";

export async function POST(request, { params }) {
  const gate = await requirePilotUser(request, "manage_active_mentorship");
  if (gate.response) return gate.response;
  try {
    const body = await request.json().catch(() => ({}));
    const { engagementId } = await params;
    return Response.json(await submitMentorshipClosingFeedback({ user: gate.user, engagementId, input: body }));
  } catch (error) {
    return routeError(error, "Closing feedback could not be saved");
  }
}

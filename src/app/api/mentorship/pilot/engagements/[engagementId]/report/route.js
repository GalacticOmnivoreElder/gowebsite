export const dynamic = "force-dynamic";

import { submitMentorshipReport } from "@/lib/mentorship-pilot-service";
import { requirePilotUser, routeError } from "@/lib/mentorship-pilot-route";

export async function POST(request, { params }) {
  const gate = await requirePilotUser(request, "manage_active_mentorship");
  if (gate.response) return gate.response;
  try {
    const body = await request.json().catch(() => ({}));
    const { engagementId } = await params;
    return Response.json(await submitMentorshipReport({ user: gate.user, engagementId, category: body.category, details: body.details, requestNoFurtherContact: body.requestNoFurtherContact === true }), { status: 201 });
  } catch (error) {
    return routeError(error, "Report could not be submitted");
  }
}

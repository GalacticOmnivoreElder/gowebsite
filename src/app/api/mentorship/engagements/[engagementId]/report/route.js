export const dynamic = "force-dynamic";

import { submitMentorshipReport } from "@/lib/mentorship-service";
import { requireMentorshipUser, routeError } from "@/lib/mentorship-route";

export async function POST(request, { params }) {
  const gate = await requireMentorshipUser(request, "manage_active_mentorship");
  if (gate.response) return gate.response;
  try {
    const body = await request.json().catch(() => ({}));
    const { engagementId } = await params;
    return Response.json(await submitMentorshipReport({ user: gate.user, engagementId, category: body.category, details: body.details, requestNoFurtherContact: body.requestNoFurtherContact === true }), { status: 201 });
  } catch (error) {
    return routeError(error, "Report could not be submitted");
  }
}

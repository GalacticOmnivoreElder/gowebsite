export const dynamic = "force-dynamic";

import { deleteMentorApplication, forwardRequestToRequestedMentor, getMentorshipAdminDashboard, resolveMentorshipReport, reviewMentorApplication, reviewMentorshipRequest, sendMentorSuggestions, updateMentorshipEngagement } from "@/lib/mentorship-service";
import { requireMentorshipAdmin, routeError } from "@/lib/mentorship-route";

export async function GET(request) {
  const gate = await requireMentorshipAdmin(request);
  if (gate.response) return gate.response;
  try {
    return Response.json(await getMentorshipAdminDashboard({ actor: gate.user }), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return routeError(error, "Mentorship operations could not be loaded");
  }
}

export async function PATCH(request) {
  const gate = await requireMentorshipAdmin(request);
  if (gate.response) return gate.response;
  try {
    const body = await request.json().catch(() => ({}));
    if (body.action === "review_mentor") return Response.json(await reviewMentorApplication({ actor: gate.user, userId: String(body.userId || ""), decision: String(body.decision || ""), internalNotes: body.internalNotes, customerMessage: body.customerMessage }));
    if (body.action === "delete_mentor_application") return Response.json(await deleteMentorApplication({ actor: gate.user, userId: String(body.userId || ""), reason: body.reason }));
    if (body.action === "review_request") return Response.json(await reviewMentorshipRequest({ actor: gate.user, requestId: String(body.requestId || ""), decision: String(body.decision || ""), customerMessage: body.customerMessage, internalNotes: body.internalNotes }));
    if (body.action === "send_suggestions") return Response.json(await sendMentorSuggestions({ actor: gate.user, requestId: String(body.requestId || ""), suggestions: body.suggestions || [] }));
    if (body.action === "forward_to_requested_mentor") return Response.json(await forwardRequestToRequestedMentor({ actor: gate.user, requestId: String(body.requestId || ""), customerMessage: body.customerMessage }));
    if (body.action === "engagement_action") return Response.json(await updateMentorshipEngagement({ user: gate.user, engagementId: String(body.engagementId || ""), action: String(body.engagementAction || ""), payload: body }));
    if (body.action === "resolve_report") return Response.json(await resolveMentorshipReport({ actor: gate.user, reportId: String(body.reportId || ""), status: String(body.status || "resolved"), notes: body.notes }));
    return Response.json({ error: "Unsupported mentorship admin action" }, { status: 400 });
  } catch (error) {
    return routeError(error, "Mentorship admin update could not be saved");
  }
}

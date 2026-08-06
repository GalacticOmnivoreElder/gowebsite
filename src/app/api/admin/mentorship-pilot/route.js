export const dynamic = "force-dynamic";

import { getMentorshipPilotAdminDashboard, resolveMentorshipPilotReport, reviewMentorPilotApplication, reviewMentorshipPilotRequest, sendMentorSuggestions, updateMentorshipPilotEngagement } from "@/lib/mentorship-pilot-service";
import { requirePilotAdmin, routeError } from "@/lib/mentorship-pilot-route";

export async function GET(request) {
  const gate = await requirePilotAdmin(request);
  if (gate.response) return gate.response;
  try {
    return Response.json(await getMentorshipPilotAdminDashboard({ actor: gate.user }), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return routeError(error, "Mentorship operations could not be loaded");
  }
}

export async function PATCH(request) {
  const gate = await requirePilotAdmin(request);
  if (gate.response) return gate.response;
  try {
    const body = await request.json().catch(() => ({}));
    if (body.action === "review_mentor") return Response.json(await reviewMentorPilotApplication({ actor: gate.user, userId: String(body.userId || ""), decision: String(body.decision || ""), internalNotes: body.internalNotes }));
    if (body.action === "review_request") return Response.json(await reviewMentorshipPilotRequest({ actor: gate.user, requestId: String(body.requestId || ""), decision: String(body.decision || ""), customerMessage: body.customerMessage, internalNotes: body.internalNotes }));
    if (body.action === "send_suggestions") return Response.json(await sendMentorSuggestions({ actor: gate.user, requestId: String(body.requestId || ""), suggestions: body.suggestions || [] }));
    if (body.action === "engagement_action") return Response.json(await updateMentorshipPilotEngagement({ user: gate.user, engagementId: String(body.engagementId || ""), action: String(body.engagementAction || ""), payload: body }));
    if (body.action === "resolve_report") return Response.json(await resolveMentorshipPilotReport({ actor: gate.user, reportId: String(body.reportId || ""), status: String(body.status || "resolved"), notes: body.notes }));
    return Response.json({ error: "Unsupported mentorship pilot admin action" }, { status: 400 });
  } catch (error) {
    return routeError(error, "Mentorship admin update could not be saved");
  }
}

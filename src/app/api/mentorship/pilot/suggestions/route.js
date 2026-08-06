export const dynamic = "force-dynamic";

import { applyToMentorSuggestion, declineMentorSuggestion, getPilotSuggestionsForUser } from "@/lib/mentorship-pilot-service";
import { requirePilotUser, routeError } from "@/lib/mentorship-pilot-route";
import { adminDb } from "@/lib/firebase-admin";

export async function GET(request) {
  const gate = await requirePilotUser(request, "manage_active_mentorship");
  if (gate.response) return gate.response;
  try {
    return Response.json({ suggestions: await getPilotSuggestionsForUser({ user: gate.user, db: adminDb }) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return routeError(error, "Mentor suggestions could not be loaded");
  }
}

export async function POST(request) {
  const gate = await requirePilotUser(request, "apply_to_suggestion");
  if (gate.response) return gate.response;
  try {
    const body = await request.json().catch(() => ({}));
    if (!body.suggestionId) return Response.json({ error: "Mentor suggestion is required" }, { status: 400 });
    return Response.json(await applyToMentorSuggestion({ user: gate.user, suggestionId: String(body.suggestionId), message: body.message, dataSharingConsent: body.dataSharingConsent === true }), { status: 201 });
  } catch (error) {
    return routeError(error, "Mentor application could not be submitted");
  }
}

export async function PATCH(request) {
  const gate = await requirePilotUser(request, "manage_active_mentorship");
  if (gate.response) return gate.response;
  try {
    const body = await request.json().catch(() => ({}));
    if (body.action !== "decline" || !body.suggestionId) return Response.json({ error: "A suggestion decline is required" }, { status: 400 });
    return Response.json(await declineMentorSuggestion({ user: gate.user, suggestionId: String(body.suggestionId) }));
  } catch (error) {
    return routeError(error, "Mentor suggestion could not be updated");
  }
}

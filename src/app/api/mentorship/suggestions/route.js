export const dynamic = "force-dynamic";

import { getRequestUser } from "@/lib/auth-utils";
import { getProductConfig } from "@/lib/product-config";
import { canSubmitMentorshipRequest } from "@/lib/mentorship";
import { suggestCompatibleMentors } from "@/lib/mentorship-service";

export async function POST(request) {
  if (!getProductConfig().featureFlags.mentorMatchmaking) return Response.json({ error: "Mentor matchmaking is not available yet" }, { status: 503 });
  const user = await getRequestUser(request);
  const body = await request.json().catch(() => ({}));
  const eligibility = canSubmitMentorshipRequest(user, { isAdult: body.isAdult === true });
  if (!eligibility.allowed) return Response.json({ error: eligibility.reason }, { status: eligibility.reason === "authentication_required" ? 401 : 403 });
  try {
    return Response.json({ suggestions: await suggestCompatibleMentors(body) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return Response.json({ error: error.code === "validation_error" ? error.message : "Mentor suggestions could not be prepared" }, { status: error.code === "validation_error" ? 400 : 500 });
  }
}

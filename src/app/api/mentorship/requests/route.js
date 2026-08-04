export const dynamic = "force-dynamic";

import { getRequestUser } from "@/lib/auth-utils";
import { getMentorshipProductConfig, getProductConfig } from "@/lib/product-config";
import { canSubmitMentorshipRequest } from "@/lib/mentorship";
import { createMentorshipRequest } from "@/lib/mentorship-service";

export async function POST(request) {
  if (!getProductConfig().featureFlags.mentorMatchmaking) return Response.json({ error: "Mentor matchmaking is not available yet" }, { status: 503 });
  const user = await getRequestUser(request);
  const body = await request.json().catch(() => ({}));
  const eligibility = canSubmitMentorshipRequest(user, { isAdult: body.isAdult === true });
  if (!eligibility.allowed) return Response.json({ error: eligibility.reason }, { status: eligibility.reason === "authentication_required" ? 401 : 403 });
  try {
    const result = await createMentorshipRequest({
      student: user,
      input: body,
      targetMentorId: String(body.targetMentorId || "").trim() || null,
      assistanceRequested: body.assistanceRequested === true,
      responseWorkingDays: getMentorshipProductConfig().responseDeadlineWorkingDays,
    });
    return Response.json(result, { status: 201 });
  } catch (error) {
    return Response.json({ error: error.code === "validation_error" ? error.message : error.message || "Mentorship request could not be created", code: error.code || "unknown" }, { status: error.status || (error.code === "validation_error" ? 400 : 500) });
  }
}

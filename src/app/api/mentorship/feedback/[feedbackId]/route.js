export const dynamic = "force-dynamic";

import { getRequestUser } from "@/lib/auth-utils";
import { getProductConfig } from "@/lib/product-config";
import { updateMentorshipFeedback } from "@/lib/mentorship-feedback-service";

export async function PATCH(request, { params }) {
  if (!getProductConfig().featureFlags.mentorFeedback) {
    return Response.json({ error: "Mentorship feedback is not available yet" }, { status: 503 });
  }
  const user = await getRequestUser(request);
  if (!user) return Response.json({ error: "Authentication required" }, { status: 401 });
  const { feedbackId } = await params;
  const body = await request.json().catch(() => ({}));
  try {
    return Response.json(await updateMentorshipFeedback({
      feedbackId,
      actor: user,
      action: String(body.action || ""),
      input: body,
    }));
  } catch (error) {
    return Response.json({ error: error.message || "Feedback could not be updated", code: error.code || "unknown" }, { status: error.status || 500 });
  }
}

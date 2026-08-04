export const dynamic = "force-dynamic";

import { getRequestUser } from "@/lib/auth-utils";
import { getMentorshipFeedbackConfig, getProductConfig } from "@/lib/product-config";
import { submitMentorshipFeedback } from "@/lib/mentorship-feedback-service";

export async function POST(request) {
  if (!getProductConfig().featureFlags.mentorFeedback) {
    return Response.json({ error: "Mentorship feedback is not available yet" }, { status: 503 });
  }
  const user = await getRequestUser(request);
  if (!user) return Response.json({ error: "Authentication required" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  try {
    const feedback = await submitMentorshipFeedback({
      engagementId: String(body.engagementId || ""),
      author: user,
      input: body,
      deadlineDays: getMentorshipFeedbackConfig().feedbackDeadlineDays,
    });
    return Response.json(feedback, { status: 201 });
  } catch (error) {
    return Response.json({ error: error.message || "Feedback could not be submitted", code: error.code || "unknown" }, { status: error.status || 500 });
  }
}

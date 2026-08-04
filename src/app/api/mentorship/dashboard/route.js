export const dynamic = "force-dynamic";

import { getRequestUser } from "@/lib/auth-utils";
import { getMentorshipFeedbackConfig, getProductConfig } from "@/lib/product-config";
import { getMentorshipDashboard } from "@/lib/mentorship-service";

export async function GET(request) {
  const product = getProductConfig();
  if (!product.featureFlags.mentorMatchmaking && !product.featureFlags.mentorFeedback) {
    return Response.json({ error: "Mentorship tools are not available yet" }, { status: 503 });
  }
  const user = await getRequestUser(request);
  if (!user) return Response.json({ error: "Authentication required" }, { status: 401 });
  return Response.json(await getMentorshipDashboard(user, {
    includeFeedback: product.featureFlags.mentorFeedback,
    feedbackDeadlineDays: getMentorshipFeedbackConfig().feedbackDeadlineDays,
  }), { headers: { "Cache-Control": "no-store" } });
}

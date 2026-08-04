export const dynamic = "force-dynamic";

import { getRequestUser } from "@/lib/auth-utils";
import { getProductConfig } from "@/lib/product-config";
import { updateMentorshipEngagement } from "@/lib/mentorship-service";

export async function PATCH(request, { params }) {
  if (!getProductConfig().featureFlags.mentorMatchmaking) return Response.json({ error: "Mentor matchmaking is not available yet" }, { status: 503 });
  const user = await getRequestUser(request);
  if (!user) return Response.json({ error: "Authentication required" }, { status: 401 });
  const { engagementId } = await params;
  const body = await request.json().catch(() => ({}));
  try {
    return Response.json(await updateMentorshipEngagement({ engagementId, actor: user, action: String(body.action || ""), payload: body }));
  } catch (error) {
    return Response.json({ error: error.message || "Mentorship update could not be saved", code: error.code || "unknown" }, { status: error.status || 500 });
  }
}

export const dynamic = "force-dynamic";

import { getRequestUser } from "@/lib/auth-utils";
import { getMentorshipProductConfig, getProductConfig } from "@/lib/product-config";
import { respondToMentorshipRequest } from "@/lib/mentorship-service";

export async function PATCH(request, { params }) {
  if (!getProductConfig().featureFlags.mentorMatchmaking) return Response.json({ error: "Mentor matchmaking is not available yet" }, { status: 503 });
  const user = await getRequestUser(request);
  if (!user) return Response.json({ error: "Authentication required" }, { status: 401 });
  const { requestId } = await params;
  const body = await request.json().catch(() => ({}));
  try {
    const result = await respondToMentorshipRequest({ requestId, mentor: user, action: String(body.action || ""), message: body.message, responseWorkingDays: getMentorshipProductConfig().responseDeadlineWorkingDays });
    return Response.json(result);
  } catch (error) {
    return Response.json({ error: error.message || "Mentor response could not be saved", code: error.code || "unknown" }, { status: error.status || 500 });
  }
}

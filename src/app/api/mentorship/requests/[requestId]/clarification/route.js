export const dynamic = "force-dynamic";

import { getRequestUser } from "@/lib/auth-utils";
import { getMentorshipProductConfig, getProductConfig } from "@/lib/product-config";
import { answerMentorshipClarification } from "@/lib/mentorship-service";

export async function PATCH(request, { params }) {
  if (!getProductConfig().featureFlags.mentorMatchmaking) return Response.json({ error: "Mentor matchmaking is not available yet" }, { status: 503 });
  const user = await getRequestUser(request);
  if (!user) return Response.json({ error: "Authentication required" }, { status: 401 });
  const { requestId } = await params;
  const body = await request.json().catch(() => ({}));
  try {
    return Response.json(await answerMentorshipClarification({ requestId, studentId: user.uid, response: body.response, responseWorkingDays: getMentorshipProductConfig().responseDeadlineWorkingDays }));
  } catch (error) {
    return Response.json({ error: error.message || "Clarification could not be saved" }, { status: error.status || 500 });
  }
}

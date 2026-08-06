import { getRequestUser } from "@/lib/auth-utils";
import { getMentorshipPilotConfig } from "@/lib/product-config";
import { authorizeMentorshipAction } from "@/lib/mentorship-pilot";

export function pilotUnavailable() {
  return Response.json({ error: "Mentorship is currently limited to a controlled pilot" }, { status: 503 });
}

export async function requirePilotUser(request, action) {
  const config = getMentorshipPilotConfig();
  const user = await getRequestUser(request);
  if (!user) return { response: Response.json({ error: "Authentication required", code: "authentication_required" }, { status: 401 }) };
  const access = authorizeMentorshipAction(user, action, config);
  if (!access.allowed) {
    const status = access.reason === "authentication_required" ? 401 : access.reason === "mentorship_not_available" ? 503 : 403;
    return { response: Response.json({ error: access.reason, code: access.reason }, { status }) };
  }
  return { user, config };
}

export async function requirePilotAdmin(request) {
  const user = await getRequestUser(request);
  if (!user) return { response: Response.json({ error: "Authentication required" }, { status: 401 }) };
  if (!user.admin) return { response: Response.json({ error: "Platform admin access required" }, { status: 403 }) };
  return { user, config: getMentorshipPilotConfig() };
}

export function routeError(error, fallback = "Mentorship update could not be saved") {
  return Response.json({ error: error?.message || fallback, code: error?.code || "unknown" }, { status: error?.status || 500 });
}

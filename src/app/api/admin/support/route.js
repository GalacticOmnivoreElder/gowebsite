export const dynamic = "force-dynamic";

import { getRequestUser } from "@/lib/auth-utils";
import { getSupportRequest, listSupportRequests, supportRouteError, updateSupportRequest } from "@/lib/support-tickets";
import { syncSupportRequestToJira } from "@/lib/jira-support";

async function requireAdmin(request) {
  const user = await getRequestUser(request);
  if (!user) return { response: Response.json({ error: "Authentication required" }, { status: 401 }) };
  if (!user.admin) return { response: Response.json({ error: "Platform admin access required" }, { status: 403 }) };
  return { user };
}

export async function GET(request) {
  const gate = await requireAdmin(request);
  if (gate.response) return gate.response;
  try {
    const ticketId = new URL(request.url).searchParams.get("ticketId");
    if (ticketId) return Response.json(await getSupportRequest({ user: gate.user, ticketId, admin: true }), { headers: { "Cache-Control": "no-store" } });
    return Response.json({ requests: await listSupportRequests({ user: gate.user, admin: true }) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return supportRouteError(error, "Support operations could not be loaded");
  }
}

export async function PATCH(request) {
  const gate = await requireAdmin(request);
  if (gate.response) return gate.response;
  try {
    const body = await request.json().catch(() => ({}));
    const ticketId = String(body.ticketId || "");
    if (body.action === "retry_jira") {
      await syncSupportRequestToJira(ticketId);
      return Response.json({ ok: true });
    }
    const ticket = await updateSupportRequest({ user: gate.user, ticketId, action: String(body.action || ""), input: body, admin: true });
    await syncSupportRequestToJira(ticketId);
    return Response.json({ ticket });
  } catch (error) {
    return supportRouteError(error, "Support operation could not be saved");
  }
}

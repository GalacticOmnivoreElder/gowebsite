export const dynamic = "force-dynamic";

import { getRequestUser } from "@/lib/auth-utils";
import { getSupportRequest, supportRouteError, updateSupportRequest } from "@/lib/support-tickets";
import { syncSupportRequestToJira } from "@/lib/jira-support";

export async function GET(request, { params }) {
  const user = await getRequestUser(request);
  if (!user) return Response.json({ error: "Authentication required" }, { status: 401 });
  try {
    const { ticketId } = await params;
    return Response.json(await getSupportRequest({ user, ticketId }), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return supportRouteError(error, "Support request could not be loaded");
  }
}

export async function PATCH(request, { params }) {
  const user = await getRequestUser(request);
  if (!user) return Response.json({ error: "Authentication required" }, { status: 401 });
  try {
    const { ticketId } = await params;
    const body = await request.json().catch(() => ({}));
    const ticket = await updateSupportRequest({ user, ticketId, action: String(body.action || ""), input: body });
    await syncSupportRequestToJira(ticketId);
    return Response.json({ ticket }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return supportRouteError(error, "Support request could not be updated");
  }
}

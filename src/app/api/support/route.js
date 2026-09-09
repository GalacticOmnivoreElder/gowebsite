export const dynamic = "force-dynamic";

import { getRequestUser } from "@/lib/auth-utils";
import { createSupportRequest, listSupportRequests, supportRouteError } from "@/lib/support-tickets";
import { syncSupportRequestToJira } from "@/lib/jira-support";

export async function GET(request) {
  const user = await getRequestUser(request);
  if (!user) return Response.json({ error: "Authentication required" }, { status: 401 });
  try {
    return Response.json({ requests: await listSupportRequests({ user }) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return supportRouteError(error, "Support requests could not be loaded");
  }
}

export async function POST(request) {
  const user = await getRequestUser(request);
  if (!user) return Response.json({ error: "Authentication required" }, { status: 401 });
  try {
    const body = await request.json().catch(() => ({}));
    const created = await createSupportRequest({ user, input: body });
    await syncSupportRequestToJira(created.ticket.id);
    const requests = await listSupportRequests({ user });
    return Response.json({ ticket: requests.find((ticket) => ticket.id === created.ticket.id) || created.ticket }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return supportRouteError(error, "Support request could not be created");
  }
}

import { getRequestUser } from "@/lib/auth-utils";
import { problem } from "@/lib/monday-builds.mjs";

export function communityResponse(data, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "private, no-store" } });
}
export async function communityRequest(request, action, { auth = false, admin = false } = {}) {
  try {
    const user = await getRequestUser(request);
    if (auth && !user) throw problem("Sign in to continue", 401);
    if (admin && !user?.admin) throw problem("GO administrator access is required", 403);
    return communityResponse(await action(user));
  } catch (error) {
    if (!error.status) console.error("community_build_request_failed", { name: error.name });
    return communityResponse({ error: error.status ? error.message : "This service is temporarily unavailable. Please try again." }, error.status || 503);
  }
}
export async function communityBody(request) {
  const text = await request.text();
  if (text.length > 12000) throw problem("Request is too large", 413);
  try {
    const body = JSON.parse(text);
    if (!body || Array.isArray(body) || typeof body !== "object") throw new Error();
    return body;
  } catch { throw problem("A valid JSON object is required"); }
}

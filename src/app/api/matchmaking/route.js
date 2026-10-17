import { getRequestUser } from "@/lib/auth-utils";
import { actOnMatch, getMatchmakingCandidates, saveMatchmakingProfile } from "@/lib/go-journey-service";
import { getProductConfig } from "@/lib/product-config";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function json(body, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
}

async function authenticated(request) {
  const user = await getRequestUser(request);
  return user || null;
}

export async function GET(request) {
  if (!getProductConfig().featureFlags.goMatchmaking) return json({ error: "GO matchmaking is not enabled." }, 503);
  const user = await authenticated(request);
  if (!user) return json({ error: "Sign in to use GO matchmaking." }, 401);
  try {
    return json(await getMatchmakingCandidates(user.uid));
  } catch {
    return json({ error: "Match suggestions are temporarily unavailable." }, 503);
  }
}

export async function PUT(request) {
  if (!getProductConfig().featureFlags.goMatchmaking) return json({ error: "GO matchmaking is not enabled." }, 503);
  const user = await authenticated(request);
  if (!user) return json({ error: "Sign in to update matchmaking preferences." }, 401);
  const text = await request.text();
  if (text.length > 12000) return json({ error: "Matchmaking preferences are too large." }, 413);
  let body;
  try { body = JSON.parse(text); } catch { return json({ error: "A valid JSON object is required." }, 400); }
  try {
    const profile = await saveMatchmakingProfile(user.uid, body || {});
    return json({ profile: { ...profile, skills: profile.skills || [] } });
  } catch (error) {
    return json({ error: error.status ? error.message : "Matchmaking preferences could not be saved." }, error.status || 503);
  }
}

export async function POST(request) {
  if (!getProductConfig().featureFlags.goMatchmaking) return json({ error: "GO matchmaking is not enabled." }, 503);
  const user = await authenticated(request);
  if (!user) return json({ error: "Sign in to respond to a match." }, 401);
  const text = await request.text();
  if (text.length > 4000) return json({ error: "The match request is too large." }, 413);
  let body;
  try { body = JSON.parse(text); } catch { return json({ error: "A valid JSON object is required." }, 400); }
  try {
    return json(await actOnMatch(user.uid, body || {}));
  } catch (error) {
    return json({ error: error.status ? error.message : "The match response could not be saved." }, error.status || 503);
  }
}

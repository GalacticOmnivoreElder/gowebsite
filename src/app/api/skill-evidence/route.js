import { getRequestUser } from "@/lib/auth-utils";
import { readSkillEvidence, requestSkillEvidence, validateSkillEvidence } from "@/lib/go-skill-evidence-service";
import { getProductConfig } from "@/lib/product-config";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function json(body, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
}

export async function GET(request) {
  if (!getProductConfig().featureFlags.goDevelopmentJourney) return json({ error: "GO skill evidence is not enabled." }, 503);
  const user = await getRequestUser(request);
  const userId = new URL(request.url).searchParams.get("userId") || user?.uid;
  if (!userId) return json({ error: "Authentication required." }, 401);
  try { return json(await readSkillEvidence(userId, user)); }
  catch (error) { return json({ error: error.status ? error.message : "Skill evidence is temporarily unavailable." }, error.status || 503); }
}

export async function POST(request) {
  if (!getProductConfig().featureFlags.goDevelopmentJourney) return json({ error: "GO skill evidence is not enabled." }, 503);
  const user = await getRequestUser(request);
  if (!user) return json({ error: "Authentication required." }, 401);
  const text = await request.text();
  if (text.length > 4000) return json({ error: "The request is too large." }, 413);
  let body;
  try { body = JSON.parse(text); } catch { return json({ error: "A valid JSON object is required." }, 400); }
  try {
    if (body.action === "request") return json(await requestSkillEvidence(user.uid, body), 201);
    if (body.action === "validate") return json(await validateSkillEvidence(user, body.evidenceId));
    return json({ error: "Choose request or validate." }, 400);
  } catch (error) {
    return json({ error: error.status ? error.message : "Skill evidence could not be saved." }, error.status || 503);
  }
}

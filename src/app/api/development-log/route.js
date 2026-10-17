import { getRequestUser } from "@/lib/auth-utils";
import { adminDb } from "@/lib/firebase-admin";
import { passportIsVisible } from "@/lib/monday-builds.mjs";
import { readJourney, updateJourneyVisibility } from "@/lib/go-journey-service";
import { getProductConfig } from "@/lib/product-config";

export const dynamic = "force-dynamic";

function json(body, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
}

export async function GET(request) {
  if (!getProductConfig().featureFlags.goDevelopmentJourney) return json({ error: "The GO development journal is not enabled." }, 503);
  const user = await getRequestUser(request);
  const targetUid = new URL(request.url).searchParams.get("userId") || user?.uid;
  if (!targetUid) return json({ error: "Authentication required." }, 401);
  const owner = user?.uid === targetUid;
  if (!owner) {
    const [userDoc, cvDoc] = await Promise.all([
      adminDb.collection("users").doc(targetUid).get(),
      adminDb.collection("go_cvs").doc(targetUid).get(),
    ]);
    const profile = userDoc.data() || {};
    const cv = cvDoc.data() || {};
    const visible = passportIsVisible({
      hasCv: cvDoc.exists,
      publicCv: cv.status === "active" && cv.visibility_public === true,
      profilePrivacy: profile.profilePrivacy,
    });
    if (!visible) return json({ error: "This development log is private." }, 404);
  }
  const cursor = new URL(request.url).searchParams.get("cursor");
  try { return json(await readJourney(targetUid, { owner, cursor })); }
  catch { return json({ error: "The development log is temporarily unavailable." }, 503); }
}

export async function PATCH(request) {
  if (!getProductConfig().featureFlags.goDevelopmentJourney) return json({ error: "The GO development journal is not enabled." }, 503);
  const user = await getRequestUser(request);
  if (!user) return json({ error: "Authentication required." }, 401);
  const text = await request.text();
  if (text.length > 2000) return json({ error: "The request is too large." }, 413);
  let body;
  try { body = JSON.parse(text); } catch { return json({ error: "A valid JSON object is required." }, 400); }
  try {
    await updateJourneyVisibility(user.uid, body || {});
    return json(await readJourney(user.uid, { owner: true }));
  } catch (error) {
    return json({ error: error.status ? error.message : "The log visibility could not be updated." }, error.status || 503);
  }
}

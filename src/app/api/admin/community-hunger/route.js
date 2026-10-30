import { getRequestUser } from "@/lib/auth-utils";
import { adminDb } from "@/lib/firebase-admin";

export async function POST(request) {
  const user = await getRequestUser(request);
  if (!user) return Response.json({ error: "Authentication required." }, { status: 401 });
  if (!user.admin) return Response.json({ error: "Admin access required." }, { status: 403 });
  try {
    const body = await request.json();
    const keys = ["capacity", "commitments", "interest", "explanation"];
    const data = Object.fromEntries(keys.map((key) => [key, String(body[key] || "").trim()]));
    const reviewedOn = String(body.reviewedOn || "");
    const reason = String(body.reason || "").trim();
    if (keys.some((key) => !data[key] || data[key].length > 2000) || !reason || reason.length > 1000 || !/^\d{4}-\d{2}-\d{2}$/.test(reviewedOn) || Number.isNaN(Date.parse(`${reviewedOn}T00:00:00Z`)) || new Date(`${reviewedOn}T00:00:00Z`).toISOString().slice(0, 10) !== reviewedOn) return Response.json({ error: "Complete every field with a valid review date and change reason." }, { status: 400 });
    data.reviewedOn = reviewedOn;
    const ref = adminDb.collection("community_hunger").doc("current");
    await adminDb.runTransaction(async (tx) => {
      const previous = await tx.get(ref);
      const now = new Date();
      tx.set(ref, { ...data, updatedAt: now, updatedBy: user.uid });
      tx.create(adminDb.collection("admin_audit_events").doc(), { action: "community_hunger.saved", actorId: user.uid, target: { type: "community_hunger", id: "current" }, previousValue: previous.exists ? previous.data() : null, newValue: data, reason, createdAt: now });
    });
    return Response.json({ ok: true });
  } catch { return Response.json({ error: "Could not save hunger information." }, { status: 500 }); }
}

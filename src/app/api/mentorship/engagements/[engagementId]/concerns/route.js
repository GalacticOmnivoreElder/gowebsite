export const dynamic = "force-dynamic";

import crypto from "crypto";
import { getRequestUser } from "@/lib/auth-utils";
import { adminDb } from "@/lib/firebase-admin";
import { getProductConfig } from "@/lib/product-config";
import { createProductNotification } from "@/lib/product-notifications";

export async function POST(request, { params }) {
  if (!getProductConfig().featureFlags.mentorMatchmaking) return Response.json({ error: "Mentor matchmaking is not available yet" }, { status: 503 });
  const user = await getRequestUser(request);
  if (!user) return Response.json({ error: "Authentication required" }, { status: 401 });
  const { engagementId } = await params;
  const body = await request.json().catch(() => ({}));
  const category = String(body.category || "").trim().slice(0, 80);
  const details = String(body.details || "").trim().slice(0, 5000);
  if (!["safety_or_conduct", "scheduling", "scope", "other"].includes(category) || !details) return Response.json({ error: "A supported concern category and details are required" }, { status: 400 });
  const engagementDoc = await adminDb.collection("mentorship_engagements").doc(engagementId).get();
  if (!engagementDoc.exists || ![engagementDoc.data().studentId, engagementDoc.data().mentorId].includes(user.uid)) return Response.json({ error: "Mentorship engagement not found" }, { status: 404 });
  const id = crypto.createHash("sha256").update(`go-mentorship-concern:v1:${engagementId}:${user.uid}:${crypto.randomUUID()}`).digest("hex");
  const now = new Date();
  await adminDb.collection("mentorship_concerns").doc(id).create({ engagementId, reporterId: user.uid, category, details, status: "open", createdAt: now, updatedAt: now });
  const admins = await adminDb.collection("users").where("admin", "==", true).limit(100).get();
  await Promise.allSettled(admins.docs.map((doc) => createProductNotification({ recipientUserId: doc.id, type: "mentorship_update", title: "Private mentorship concern", message: "A mentorship participant submitted a private concern for administrator review.", actionUrl: "/admin/mentorships" })));
  return Response.json({ id, status: "open" }, { status: 201 });
}

// @ts-check

export const dynamic = "force-dynamic";

import { getRequestUser } from "@/lib/auth-utils";
import { adminDb } from "@/lib/firebase-admin";
import { getProductConfig } from "@/lib/product-config";
import { serializeProductNotification } from "@/lib/product-notifications";

function featureUnavailable() {
  return Response.json({ error: "Notifications are not available yet" }, { status: 503 });
}

export async function GET(request) {
  if (!getProductConfig().featureFlags.userNotifications) return featureUnavailable();
  const user = await getRequestUser(request);
  if (!user) return Response.json({ error: "Authentication required" }, { status: 401 });
  const collection = adminDb.collection("product_notifications");
  const [snapshot, unreadSnapshot] = await Promise.all([
    collection.where("recipientUserId", "==", user.uid).orderBy("createdAt", "desc").limit(100).get(),
    collection.where("recipientUserId", "==", user.uid).where("readAt", "==", null).count().get(),
  ]);
  const notifications = snapshot.docs.map((doc) => serializeProductNotification(doc.id, doc.data()));
  return Response.json({
    notifications,
    unreadCount: unreadSnapshot.data().count,
  }, { headers: { "Cache-Control": "no-store" } });
}

export async function PATCH(request) {
  if (!getProductConfig().featureFlags.userNotifications) return featureUnavailable();
  const user = await getRequestUser(request);
  if (!user) return Response.json({ error: "Authentication required" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const now = new Date();
  if (body.all === true) {
    let updated = 0;
    let snapshot;
    do {
      snapshot = await adminDb.collection("product_notifications")
        .where("recipientUserId", "==", user.uid)
        .where("readAt", "==", null)
        .limit(100)
        .get();
      if (snapshot.empty) break;
      const batch = adminDb.batch();
      snapshot.docs.forEach((doc) => batch.update(doc.ref, { readAt: now }));
      await batch.commit();
      updated += snapshot.size;
    } while (snapshot.size === 100);
    return Response.json({ updated });
  }

  const notificationId = String(body.notificationId || "").trim();
  if (!notificationId) return Response.json({ error: "notificationId is required" }, { status: 400 });
  const ref = adminDb.collection("product_notifications").doc(notificationId);
  const doc = await ref.get();
  if (!doc.exists || doc.data().recipientUserId !== user.uid) {
    return Response.json({ error: "Notification not found" }, { status: 404 });
  }
  await ref.update({ readAt: now });
  return Response.json({ updated: 1 });
}

// @ts-check

export const dynamic = "force-dynamic";

import { getRequestUser } from "@/lib/auth-utils";
import { adminDb } from "@/lib/firebase-admin";
import { getProductConfig } from "@/lib/product-config";
import { serializeProductNotification } from "@/lib/product-notifications";

function logNotificationsEnvDiagnostics(reason = "request") {
  const raw = process.env.USER_NOTIFICATIONS_ENABLED;
  const config = getProductConfig();
  console.log(
    "[Notifications env debug]",
    reason,
    JSON.stringify(
      {
        vercelEnv: process.env.VERCEL_ENV || null,
        nodeEnv: process.env.NODE_ENV || null,
        USER_NOTIFICATIONS_ENABLED: {
          set: raw != null,
          length: raw == null ? 0 : String(raw).length,
          rawPreview: raw == null ? null : JSON.stringify(String(raw)),
          parsedAsEnabled: config.featureFlags.userNotifications,
        },
      },
      null,
      2
    )
  );
}

function featureUnavailable() {
  return Response.json(
    {
      error: "Notifications are not available yet",
      detail: "USER_NOTIFICATIONS_ENABLED is missing or not a truthy value (true/1/yes/on).",
      debug: {
        USER_NOTIFICATIONS_ENABLED: {
          set: process.env.USER_NOTIFICATIONS_ENABLED != null,
          rawPreview:
            process.env.USER_NOTIFICATIONS_ENABLED == null
              ? null
              : JSON.stringify(String(process.env.USER_NOTIFICATIONS_ENABLED)),
          parsedAsEnabled: getProductConfig().featureFlags.userNotifications,
        },
      },
    },
    { status: 503 }
  );
}

export async function GET(request) {
  logNotificationsEnvDiagnostics("GET /api/notifications");
  if (!getProductConfig().featureFlags.userNotifications) return featureUnavailable();
  const user = await getRequestUser(request);
  if (!user) return Response.json({ error: "Authentication required" }, { status: 401 });
  const snapshot = await adminDb.collection("product_notifications")
    .where("recipientUserId", "==", user.uid)
    .orderBy("createdAt", "desc")
    .limit(100)
    .get();
  const notifications = snapshot.docs.map((doc) => serializeProductNotification(doc.id, doc.data()));
  return Response.json({
    notifications,
    unreadCount: notifications.filter((notification) => !notification.readAt).length,
  }, { headers: { "Cache-Control": "no-store" } });
}

export async function PATCH(request) {
  if (!getProductConfig().featureFlags.userNotifications) return featureUnavailable();
  const user = await getRequestUser(request);
  if (!user) return Response.json({ error: "Authentication required" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const now = new Date();
  if (body.all === true) {
    const snapshot = await adminDb.collection("product_notifications")
      .where("recipientUserId", "==", user.uid)
      .where("readAt", "==", null)
      .limit(100)
      .get();
    const batch = adminDb.batch();
    snapshot.docs.forEach((doc) => batch.update(doc.ref, { readAt: now }));
    await batch.commit();
    return Response.json({ updated: snapshot.size });
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

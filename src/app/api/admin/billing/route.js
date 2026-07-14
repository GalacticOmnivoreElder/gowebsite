import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { getRequestUser } from "@/lib/auth-utils";
import { serializeFirestoreDate } from "@/lib/project-utils";

async function verifyAdmin(request) {
  const user = await getRequestUser(request);
  return user?.admin ? user : null;
}

export async function GET(request) {
  try {
    const adminUser = await verifyAdmin(request);
    if (!adminUser) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const [usersSnapshot, ordersSnapshot, eventsSnapshot] = await Promise.all([
      adminDb.collection("users").limit(500).get(),
      adminDb.collection("orders").orderBy("createdAt", "desc").limit(100).get(),
      adminDb
        .collection("subscription_events")
        .orderBy("processedAt", "desc")
        .limit(100)
        .get(),
    ]);

    const usersById = new Map();
    const subscriptions = [];
    usersSnapshot.forEach((doc) => {
      const data = doc.data();
      usersById.set(doc.id, data);

      if (data.polarCustomerId || data.subscriptionId || data.activeMember) {
        subscriptions.push({
          userId: doc.id,
          username: data.username || data.name || "Unknown",
          email: data.email || "",
          activeMember: !!data.activeMember,
          subscriptionStatus: data.subscriptionStatus || "unknown",
          willRenew: !!data.willRenew,
          polarCustomerId: data.polarCustomerId || null,
          subscriptionId: data.subscriptionId || null,
          subscriptionEndsAt: serializeFirestoreDate(data.subscriptionEndsAt),
          canceledAt: serializeFirestoreDate(data.canceledAt),
          updatedAt: serializeFirestoreDate(data.updatedAt),
        });
      }
    });

    const orders = ordersSnapshot.docs.map((doc) => {
      const data = doc.data();
      const user = usersById.get(data.userId);
      return {
        id: doc.id,
        ...data,
        username: user?.username || user?.name || "Unknown",
        userEmail: user?.email || data.customerEmail || "",
        createdAt: serializeFirestoreDate(data.createdAt),
        paidAt: serializeFirestoreDate(data.paidAt),
        refundedAt: serializeFirestoreDate(data.refundedAt),
        webhookProcessedAt: serializeFirestoreDate(data.webhookProcessedAt),
      };
    });

    const events = eventsSnapshot.docs.map((doc) => {
      const data = doc.data();
      const user = usersById.get(data.userId);
      return {
        id: doc.id,
        userId: data.userId,
        username: user?.username || user?.name || "Unknown",
        userEmail: user?.email || "",
        subscriptionId: data.subscriptionId || null,
        eventType: data.eventType || "unknown",
        processedAt: serializeFirestoreDate(data.processedAt),
        accessEndsAt: serializeFirestoreDate(data.accessEndsAt),
      };
    });

    return NextResponse.json({ subscriptions, orders, events });
  } catch (error) {
    console.error("Error fetching admin billing data:", error);
    return NextResponse.json(
      { error: "Failed to fetch admin billing data" },
      { status: 500 }
    );
  }
}

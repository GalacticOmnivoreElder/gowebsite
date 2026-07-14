import { adminDb } from "@/lib/firebase-admin";
import { getRequestUser } from "@/lib/auth-utils";

function toDate(value) {
  if (!value) return null;
  if (typeof value?.toDate === "function") return value.toDate();
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function monthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

// GET /api/admin/dashboard-analytics
// Real "Recent Activity" feed + 6-month membership growth, aggregated
// server-side from users / projects / orders / subscription_events.
export async function GET(request) {
  try {
    const adminUser = await getRequestUser(request);
    if (!adminUser) return Response.json({ error: "No token provided" }, { status: 401 });
    if (!adminUser.admin) return Response.json({ error: "Not an admin" }, { status: 403 });

    const [usersSnap, projectsSnap, ordersSnap, eventsSnap] = await Promise.all([
      adminDb.collection("users").limit(2000).get(),
      adminDb.collection("projects").orderBy("createdAt", "desc").limit(8).get().catch(() => ({ docs: [] })),
      adminDb.collection("orders").orderBy("createdAt", "desc").limit(300).get().catch(() => ({ docs: [] })),
      adminDb.collection("subscription_events").orderBy("processedAt", "desc").limit(8).get().catch(() => ({ docs: [] })),
    ]);

    const usersById = new Map();
    usersSnap.forEach((doc) => usersById.set(doc.id, doc.data()));
    const nameFor = (uid, fallbackEmail) => {
      const u = usersById.get(uid);
      return u?.username || u?.name || u?.email || fallbackEmail || "Someone";
    };

    // ---- Build the last 6 month buckets (oldest -> newest) ----
    const now = new Date();
    const buckets = [];
    const bucketIndex = new Map();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = monthKey(d);
      const entry = {
        key,
        label: MONTH_LABELS[d.getMonth()],
        signups: 0,
        members: 0,
      };
      bucketIndex.set(key, entry);
      buckets.push(entry);
    }

    // Signups per month (new user docs)
    usersById.forEach((data) => {
      const created = toDate(data.createdAt);
      if (!created) return;
      const entry = bucketIndex.get(monthKey(created));
      if (entry) entry.signups += 1;
    });

    // New paying members per month (paid orders)
    (ordersSnap.docs || []).forEach((doc) => {
      const data = doc.data();
      const paid = toDate(data.paidAt) || toDate(data.createdAt);
      if (!paid) return;
      const status = (data.status || "").toLowerCase();
      if (status && status !== "paid") return;
      const entry = bucketIndex.get(monthKey(paid));
      if (entry) entry.members += 1;
    });

    // ---- Recent activity feed (merge + sort newest first) ----
    const activity = [];

    (projectsSnap.docs || []).forEach((doc) => {
      const data = doc.data();
      const ts = toDate(data.createdAt);
      if (!ts) return;
      activity.push({
        id: `project-${doc.id}`,
        type: "project",
        title: `New project: ${data.title || "Untitled"}`,
        subtitle: `by ${nameFor(data.owner)}`,
        timestamp: ts.toISOString(),
      });
    });

    // Newest signups (sort the fetched users by createdAt, take a few)
    [...usersById.entries()]
      .map(([id, data]) => ({ id, data, ts: toDate(data.createdAt) }))
      .filter((u) => u.ts)
      .sort((a, b) => b.ts - a.ts)
      .slice(0, 8)
      .forEach(({ id, data, ts }) => {
        activity.push({
          id: `user-${id}`,
          type: "user",
          title: `New user: ${data.username || data.name || data.email || "Guest"}`,
          subtitle: data.email || "",
          timestamp: ts.toISOString(),
        });
      });

    (ordersSnap.docs || []).slice(0, 8).forEach((doc) => {
      const data = doc.data();
      const ts = toDate(data.paidAt) || toDate(data.createdAt);
      if (!ts) return;
      const amount =
        typeof data.amount === "number"
          ? ` (${(data.amount / 100).toLocaleString("en-US", {
              style: "currency",
              currency: (data.currency || "USD").toUpperCase(),
            })})`
          : "";
      activity.push({
        id: `order-${doc.id}`,
        type: "order",
        title: `Payment ${data.status || "paid"}${amount}`,
        subtitle: nameFor(data.userId, data.customerEmail),
        timestamp: ts.toISOString(),
      });
    });

    (eventsSnap.docs || []).forEach((doc) => {
      const data = doc.data();
      const ts = toDate(data.processedAt);
      if (!ts) return;
      activity.push({
        id: `event-${doc.id}`,
        type: "subscription",
        title: `Subscription ${data.eventType || "updated"}`,
        subtitle: nameFor(data.userId),
        timestamp: ts.toISOString(),
      });
    });

    activity.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    return Response.json({
      recentActivity: activity.slice(0, 15),
      membershipGrowth: buckets,
    });
  } catch (error) {
    console.error("Error building dashboard analytics:", error);
    return Response.json({ error: "Failed to build analytics" }, { status: 500 });
  }
}

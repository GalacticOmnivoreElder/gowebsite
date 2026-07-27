import { NextResponse } from "next/server";
import { getRequestUser } from "@/lib/auth-utils";
import {
  anonymizeNewsletterSubscriber,
  manuallySuppressNewsletterSubscriber,
  resendPendingNewsletterConfirmation,
} from "@/lib/email/newsletter";
import { asIsoString } from "@/lib/email/utils";
import { adminDb } from "@/lib/firebase-admin";

async function requireAdmin(request) {
  const user = await getRequestUser(request);
  if (!user) {
    return {
      response: NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      ),
    };
  }
  if (!user.admin) {
    return {
      response: NextResponse.json(
        { error: "Platform admin access required" },
        { status: 403 }
      ),
    };
  }
  return { user };
}

function csvEscape(value) {
  const string = String(value ?? "");
  return `"${string.replaceAll('"', '""')}"`;
}

export async function GET(request) {
  const gate = await requireAdmin(request);
  if (gate.response) return gate.response;

  const { searchParams } = new URL(request.url);
  const subscriberCollection = adminDb.collection("newsletter_subscribers");
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const count = async (query) => {
    const result = await query.count().get();
    return result.data().count;
  };
  const statusNames = [
    "subscribed",
    "pending",
    "unsubscribed",
    "suppressed",
    "bounced",
    "complained",
  ];
  const [subscribersSnapshot, eventsSnapshot, deliverySnapshot, ...counts] =
    await Promise.all([
      subscriberCollection.orderBy("updatedAt", "desc").limit(500).get(),
      adminDb
        .collection("newsletter_events")
        .orderBy("occurredAt", "desc")
        .limit(100)
        .get()
        .catch(() => ({ docs: [] })),
      adminDb
        .collection("email_delivery_events")
        .orderBy("occurredAt", "desc")
        .limit(100)
        .get()
        .catch(() => ({ docs: [] })),
      count(subscriberCollection),
      ...statusNames.map((status) =>
        count(subscriberCollection.where("status", "==", status))
      ),
      count(subscriberCollection.where("requestedAt", ">=", sevenDaysAgo)),
      count(subscriberCollection.where("requestedAt", ">=", thirtyDaysAgo)),
    ]);

  const subscribers = subscribersSnapshot.docs
    .map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        email: data.normalizedEmail,
        status: data.status,
        source: data.source,
        topics: data.topics || {},
        requestedAt: asIsoString(data.requestedAt),
        confirmedAt: asIsoString(data.confirmedAt),
        unsubscribedAt: asIsoString(data.unsubscribedAt),
        updatedAt: asIsoString(data.updatedAt),
      };
    })
    .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));

  if (searchParams.get("format") === "csv") {
    const rows = [
      ["email", "status", "source", "requestedAt", "confirmedAt"],
      ...subscribers.map((item) => [
        item.email,
        item.status,
        item.source,
        item.requestedAt,
        item.confirmedAt,
      ]),
    ];
    return new Response(
      rows.map((row) => row.map(csvEscape).join(",")).join("\n"),
      {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition":
            'attachment; filename="galactic-omnivore-newsletter.csv"',
          "Cache-Control": "no-store",
        },
      }
    );
  }

  const stats = {
    total: counts[0],
    subscribed: counts[1],
    pending: counts[2],
    unsubscribed: counts[3],
    suppressed: counts[4],
    bounced: counts[5],
    complained: counts[6],
    recent7Days: counts[7],
    recent30Days: counts[8],
    topics: { newsletter: 0, newPackages: 0, promotions: 0 },
    sources: {},
    deliveryHealth: {},
  };
  subscribers.forEach((subscriber) => {
    stats.sources[subscriber.source || "unknown"] =
      (stats.sources[subscriber.source || "unknown"] || 0) + 1;
    Object.keys(stats.topics).forEach((topic) => {
      if (subscriber.topics?.[topic]) stats.topics[topic] += 1;
    });
  });
  stats.suppressed += stats.bounced + stats.complained;
  deliverySnapshot.docs.forEach((doc) => {
    const eventType = doc.data().eventType || "unknown";
    stats.deliveryHealth[eventType] =
      (stats.deliveryHealth[eventType] || 0) + 1;
  });

  return NextResponse.json({
    stats,
    subscribers,
    events: eventsSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        subscriberId: data.subscriberId,
        eventType: data.eventType,
        source: data.source || null,
        occurredAt: asIsoString(data.occurredAt),
      };
    }),
    delivery: deliverySnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        eventType: data.eventType,
        occurredAt: asIsoString(data.occurredAt),
      };
    }),
  });
}

export async function POST(request) {
  const gate = await requireAdmin(request);
  if (gate.response) return gate.response;
  const body = await request.json().catch(() => ({}));
  if (!body.subscriberId) {
    return NextResponse.json(
      { error: "Subscriber id is required" },
      { status: 400 }
    );
  }

  if (body.action === "resend_confirmation") {
    const result = await resendPendingNewsletterConfirmation(body.subscriberId);
    return NextResponse.json(result);
  }
  if (body.action === "suppress") {
    const suppressed = await manuallySuppressNewsletterSubscriber(
      body.subscriberId
    );
    return NextResponse.json({ suppressed });
  }
  if (body.action === "anonymize") {
    const anonymized = await anonymizeNewsletterSubscriber(body.subscriberId);
    return NextResponse.json({ anonymized });
  }
  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}

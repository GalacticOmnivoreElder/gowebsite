export const dynamic = "force-dynamic";

import crypto from "crypto";
import { adminDb } from "@/lib/firebase-admin";
import { getRequestUser } from "@/lib/auth-utils";
import { hasResourceAccess } from "@/lib/content-entitlements";
import { isPublicResourceStatus } from "@/lib/content-visibility";

const TICKET_LIFETIME_MS = 2 * 60 * 1000;

function unavailable() {
  return Response.json({ error: "Resource unavailable" }, { status: 404 });
}

function validDownloadUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}

export async function POST(request, { params }) {
  const user = await getRequestUser(request);
  if (!user) {
    return Response.json({ error: "Authentication required" }, { status: 401 });
  }

  const { resourceId } = await params;
  const body = await request.json().catch(() => ({}));
  const assetIndex = Number(body.assetIndex);
  if (!Number.isInteger(assetIndex) || assetIndex < 0) return unavailable();

  const resourceRef = adminDb.collection("packages").doc(resourceId);
  const resourceDoc = await resourceRef.get();
  if (!resourceDoc.exists) return unavailable();

  const resource = resourceDoc.data();
  if (!isPublicResourceStatus(resource.status)) return unavailable();
  if (!hasResourceAccess(resourceId, user.userData || {}, { admin: user.admin })) {
    return Response.json({ error: "Membership access required" }, { status: 403 });
  }
  if (!validDownloadUrl(resource.assets?.[assetIndex]?.downloadUrl)) return unavailable();

  const ticket = crypto.randomBytes(32).toString("base64url");
  const now = new Date();
  await adminDb.collection("protected_link_tickets").doc(ticket).set({
    assetIndex,
    consumedAt: null,
    createdAt: now,
    expiresAt: new Date(now.getTime() + TICKET_LIFETIME_MS),
    resourceId,
    userId: user.uid,
  });

  return Response.json(
    { openUrl: `/resources/${encodeURIComponent(resourceId)}/open?ticket=${encodeURIComponent(ticket)}` },
    { headers: { "Cache-Control": "no-store" } }
  );
}

export async function GET(request, { params }) {
  const { resourceId } = await params;
  const ticket = new URL(request.url).searchParams.get("ticket");
  if (!ticket || !/^[A-Za-z0-9_-]{40,}$/.test(ticket)) return unavailable();

  const ticketRef = adminDb.collection("protected_link_tickets").doc(ticket);
  const destination = await adminDb.runTransaction(async (transaction) => {
    const ticketDoc = await transaction.get(ticketRef);
    if (!ticketDoc.exists) return null;
    const ticketData = ticketDoc.data();
    const expiresAt = ticketData.expiresAt?.toDate?.() || new Date(ticketData.expiresAt);
    if (
      ticketData.resourceId !== resourceId ||
      ticketData.consumedAt ||
      !Number.isFinite(expiresAt.getTime()) ||
      expiresAt.getTime() <= Date.now()
    ) {
      return null;
    }

    const resourceRef = adminDb.collection("packages").doc(resourceId);
    const userRef = adminDb.collection("users").doc(ticketData.userId);
    const [resourceDoc, userDoc] = await Promise.all([
      transaction.get(resourceRef),
      transaction.get(userRef),
    ]);
    if (!resourceDoc.exists || !userDoc.exists) return null;

    const resource = resourceDoc.data();
    const userData = userDoc.data();
    if (
      !isPublicResourceStatus(resource.status) ||
      !hasResourceAccess(resourceId, userData, { admin: userData.admin === true })
    ) {
      return null;
    }

    const url = validDownloadUrl(resource.assets?.[ticketData.assetIndex]?.downloadUrl);
    if (!url) return null;
    transaction.update(ticketRef, { consumedAt: new Date() });
    return url.toString();
  });

  if (!destination) return unavailable();
  return new Response(null, {
    status: 303,
    headers: {
      "Cache-Control": "no-store",
      Location: destination,
      "Referrer-Policy": "no-referrer",
    },
  });
}

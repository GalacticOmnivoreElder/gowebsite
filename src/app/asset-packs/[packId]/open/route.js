export const dynamic = "force-dynamic";

import crypto from "crypto";
import { adminDb } from "@/lib/firebase-admin";
import { getRequestUser } from "@/lib/auth-utils";
import { getProductConfig } from "@/lib/product-config";
import { assetPackGrantId, hasAssetPackAccess } from "@/lib/asset-packs";

const TICKET_LIFETIME_MS = 2 * 60 * 1000;
function unavailable() { return Response.json({ error: "Asset pack unavailable" }, { status: 404, headers: { "Cache-Control": "no-store" } }); }

export async function POST(request, { params }) {
  if (!getProductConfig().featureFlags.communityAssetSubmissions) return Response.json({ error: "Community asset packs are not available yet" }, { status: 503 });
  const { packId } = await params;
  const [packDoc, user] = await Promise.all([adminDb.collection("asset_packs").doc(packId).get(), getRequestUser(request)]);
  if (!packDoc.exists) return unavailable();
  const pack = packDoc.data();
  let granted = false;
  if (user && pack.accessType === "individual") {
    const grant = await adminDb.collection("asset_pack_grants").doc(assetPackGrantId(packId, user.uid)).get();
    granted = grant.exists && grant.data().status === "active";
  }
  if (!hasAssetPackAccess(pack, user, { individuallyGranted: granted })) return Response.json({ error: user ? "This asset pack is not included in your access" : "Authentication required" }, { status: user ? 403 : 401 });
  const ticket = crypto.randomBytes(32).toString("base64url");
  const now = new Date();
  await adminDb.collection("protected_link_tickets").doc(ticket).create({ contentType: "asset_pack", assetPackId: packId, versionId: pack.currentVersionId, userId: user?.uid || null, consumedAt: null, createdAt: now, expiresAt: new Date(now.getTime() + TICKET_LIFETIME_MS) });
  return Response.json({ openUrl: `/asset-packs/${encodeURIComponent(packId)}/open?ticket=${encodeURIComponent(ticket)}` }, { headers: { "Cache-Control": "no-store" } });
}

export async function GET(request, { params }) {
  if (!getProductConfig().featureFlags.communityAssetSubmissions) return Response.json({ error: "Community asset packs are not available yet" }, { status: 503 });
  const { packId } = await params;
  const ticket = new URL(request.url).searchParams.get("ticket");
  if (!ticket || !/^[A-Za-z0-9_-]{40,}$/.test(ticket)) return unavailable();
  const ticketRef = adminDb.collection("protected_link_tickets").doc(ticket);
  const destination = await adminDb.runTransaction(async (transaction) => {
    const ticketDoc = await transaction.get(ticketRef);
    if (!ticketDoc.exists) return null;
    const data = ticketDoc.data();
    const expiresAt = data.expiresAt?.toDate?.() || new Date(data.expiresAt);
    if (data.contentType !== "asset_pack" || data.assetPackId !== packId || data.consumedAt || expiresAt <= new Date()) return null;
    const packRef = adminDb.collection("asset_packs").doc(packId);
    const versionRef = adminDb.collection("asset_pack_versions").doc(data.versionId);
    const reads = [transaction.get(packRef), transaction.get(versionRef)];
    let userRef;
    let grantRef;
    if (data.userId) {
      userRef = adminDb.collection("users").doc(data.userId);
      grantRef = adminDb.collection("asset_pack_grants").doc(assetPackGrantId(packId, data.userId));
      reads.push(transaction.get(userRef), transaction.get(grantRef));
    }
    const snapshots = await Promise.all(reads);
    if (!snapshots[0].exists || !snapshots[1].exists || snapshots[0].data().currentVersionId !== data.versionId) return null;
    const user = data.userId && snapshots[2].exists ? { uid: data.userId, admin: snapshots[2].data().admin === true, userData: snapshots[2].data() } : null;
    const granted = data.userId && snapshots[3].exists && snapshots[3].data().status === "active";
    if (!hasAssetPackAccess(snapshots[0].data(), user, { individuallyGranted: granted })) return null;
    let url;
    try { url = new URL(snapshots[1].data().downloadUrl); } catch { return null; }
    if (url.protocol !== "https:" || url.hostname !== "drive.google.com") return null;
    transaction.update(ticketRef, { consumedAt: new Date() });
    return url.toString();
  });
  if (!destination) return unavailable();
  return new Response(null, { status: 303, headers: { Location: destination, "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } });
}

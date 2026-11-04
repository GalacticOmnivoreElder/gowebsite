// @ts-check

export const dynamic = "force-dynamic";

import { getRequestUser } from "@/lib/auth-utils";
import { adminDb } from "@/lib/firebase-admin";
import { getProductConfig } from "@/lib/product-config";
import { hasMentorToolAccess } from "@/lib/content-entitlements";
import {
  cleanMentorProfile,
  getMentorCapacity,
  isMentorProfileComplete,
  mergeMentorAvailability,
  normalizeMentorProfile,
  serializeMentorDate,
  toPublicMentorProfileDto,
} from "@/lib/mentor-profiles";

function unavailable() {
  return Response.json({ error: "Mentor profiles are not available yet" }, { status: 503 });
}

export async function GET(request) {
  if (!getProductConfig().featureFlags.mentorDirectory) return unavailable();
  const user = await getRequestUser(request);
  if (!user) return Response.json({ error: "Authentication required" }, { status: 401 });
  const [profileDoc, availabilityDoc] = await Promise.all([
    adminDb.collection("mentor_profiles").doc(user.uid).get(),
    adminDb.collection("mentor_availability").doc(user.uid).get(),
  ]);
  const storedProfile = profileDoc.exists ? profileDoc.data() : null;
  const availability = availabilityDoc.exists ? availabilityDoc.data() : null;
  const profile = storedProfile ? mergeMentorAvailability(storedProfile, availability) : null;
  const normalized = storedProfile ? normalizeMentorProfile(storedProfile) : null;
  const publicNormalized = profile ? normalizeMentorProfile(profile) : null;
  const canManage = hasMentorToolAccess(user.userData || {}, { admin: user.admin });
  return Response.json({
    mentorStatus: user.userData?.mentorStatus || "none",
    publicProfileEnabled: user.userData?.mentorPublicProfileEnabled === true,
    canManage,
    mentorAccessReason: canManage ? null : user.userData?.mentorStatus === "approved" ? "mentor_membership_required" : "approval_required",
    availabilityEnabled: getProductConfig().featureFlags.mentorAvailability,
    profile: normalized ? {
      ...normalized,
      createdAt: serializeMentorDate(storedProfile.createdAt),
      updatedAt: serializeMentorDate(storedProfile.updatedAt),
    } : null,
    capacity: publicNormalized ? getMentorCapacity(publicNormalized) : null,
    publicProfilePreview: publicNormalized && isMentorProfileComplete(publicNormalized)
      ? toPublicMentorProfileDto(user.uid, publicNormalized)
      : null,
  }, { headers: { "Cache-Control": "no-store" } });
}

export async function PATCH(request) {
  if (!getProductConfig().featureFlags.mentorDirectory) return unavailable();
  const user = await getRequestUser(request);
  if (!user) return Response.json({ error: "Authentication required" }, { status: 401 });
  if (!hasMentorToolAccess(user.userData || {}, { admin: user.admin })) {
    return Response.json({ error: "Active verified Mentor membership is required" }, { status: 403 });
  }
  try {
    const body = await request.json().catch(() => ({}));
    const ref = adminDb.collection("mentor_profiles").doc(user.uid);
    const previousDoc = await ref.get();
    const previous = previousDoc.exists ? previousDoc.data() : {};
    const clean = cleanMentorProfile({ ...previous, ...body });
    const now = new Date();
    const data = {
      ...clean,
      userId: user.uid,
      createdAt: previous.createdAt || now,
      updatedAt: now,
    };
    await ref.set(data, { merge: true });
    const normalized = normalizeMentorProfile(data);
    const availabilityDoc = await adminDb.collection("mentor_availability").doc(user.uid).get();
    const publicNormalized = normalizeMentorProfile(
      mergeMentorAvailability(data, availabilityDoc.exists ? availabilityDoc.data() : null)
    );
    return Response.json({
      profile: { ...normalized, createdAt: serializeMentorDate(data.createdAt), updatedAt: now.toISOString() },
      capacity: getMentorCapacity(publicNormalized),
      publicProfilePreview: isMentorProfileComplete(publicNormalized)
        ? toPublicMentorProfileDto(user.uid, publicNormalized)
        : null,
      publicProfileEnabled: user.userData?.mentorPublicProfileEnabled === true,
    });
  } catch (error) {
    return Response.json({ error: error.code === "validation_error" ? error.message : "Mentor profile could not be saved" }, { status: error.code === "validation_error" ? 400 : 500 });
  }
}

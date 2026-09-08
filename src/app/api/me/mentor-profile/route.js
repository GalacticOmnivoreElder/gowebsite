// @ts-check

export const dynamic = "force-dynamic";

import { getRequestUser } from "@/lib/auth-utils";
import { adminDb } from "@/lib/firebase-admin";
import { getProductConfig } from "@/lib/product-config";
import {
  cleanMentorProfile,
  getMentorCapacity,
  isMentorProfileComplete,
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
  const profileDoc = await adminDb.collection("mentor_profiles").doc(user.uid).get();
  const profile = profileDoc.exists ? profileDoc.data() : null;
  const normalized = profile ? normalizeMentorProfile(profile) : null;
  return Response.json({
    mentorStatus: user.userData?.mentorStatus || "none",
    publicProfileEnabled: user.userData?.mentorPublicProfileEnabled === true,
    canManage: user.userData?.mentorStatus === "approved",
    availabilityEnabled: getProductConfig().featureFlags.mentorAvailability,
    profile: normalized ? {
      ...normalized,
      createdAt: serializeMentorDate(profile.createdAt),
      updatedAt: serializeMentorDate(profile.updatedAt),
    } : null,
    capacity: normalized ? getMentorCapacity(normalized) : null,
    publicProfilePreview: normalized && isMentorProfileComplete(normalized)
      ? toPublicMentorProfileDto(user.uid, normalized)
      : null,
  }, { headers: { "Cache-Control": "no-store" } });
}

export async function PATCH(request) {
  if (!getProductConfig().featureFlags.mentorDirectory) return unavailable();
  const user = await getRequestUser(request);
  if (!user) return Response.json({ error: "Authentication required" }, { status: 401 });
  if (user.userData?.mentorStatus !== "approved") {
    return Response.json({ error: "Approved mentor status is required" }, { status: 403 });
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
    return Response.json({
      profile: { ...normalized, createdAt: serializeMentorDate(data.createdAt), updatedAt: now.toISOString() },
      capacity: getMentorCapacity(normalized),
      publicProfilePreview: isMentorProfileComplete(normalized)
        ? toPublicMentorProfileDto(user.uid, normalized)
        : null,
      publicProfileEnabled: user.userData?.mentorPublicProfileEnabled === true,
    });
  } catch (error) {
    return Response.json({ error: error.code === "validation_error" ? error.message : "Mentor profile could not be saved" }, { status: error.code === "validation_error" ? 400 : 500 });
  }
}

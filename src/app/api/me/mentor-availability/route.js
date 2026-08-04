// @ts-check

export const dynamic = "force-dynamic";

import { getRequestUser } from "@/lib/auth-utils";
import { adminDb } from "@/lib/firebase-admin";
import { getProductConfig } from "@/lib/product-config";
import { cleanMentorAvailability, publicAvailabilitySummary, serializeMentorDate } from "@/lib/mentor-profiles";

function unavailable() {
  return Response.json({ error: "Mentor availability is not available yet" }, { status: 503 });
}

async function gate(request) {
  if (!getProductConfig().featureFlags.mentorAvailability) return { response: unavailable() };
  const user = await getRequestUser(request);
  if (!user) return { response: Response.json({ error: "Authentication required" }, { status: 401 }) };
  if (user.userData?.mentorStatus !== "approved") return { response: Response.json({ error: "Approved mentor status is required" }, { status: 403 }) };
  return { user };
}

export async function GET(request) {
  const access = await gate(request);
  if (access.response) return access.response;
  const doc = await adminDb.collection("mentor_availability").doc(access.user.uid).get();
  const data = doc.exists ? doc.data() : null;
  return Response.json({
    availability: data ? { ...data, createdAt: serializeMentorDate(data.createdAt), updatedAt: serializeMentorDate(data.updatedAt) } : null,
  }, { headers: { "Cache-Control": "no-store" } });
}

export async function PATCH(request) {
  const access = await gate(request);
  if (access.response) return access.response;
  try {
    const body = await request.json().catch(() => ({}));
    const availabilityRef = adminDb.collection("mentor_availability").doc(access.user.uid);
    const profileRef = adminDb.collection("mentor_profiles").doc(access.user.uid);
    const previousDoc = await availabilityRef.get();
    const previous = previousDoc.exists ? previousDoc.data() : {};
    const clean = cleanMentorAvailability({ ...previous, ...body });
    const summary = publicAvailabilitySummary(clean);
    const now = new Date();
    const data = { ...clean, userId: access.user.uid, createdAt: previous.createdAt || now, updatedAt: now };
    const batch = adminDb.batch();
    batch.set(availabilityRef, data, { merge: true });
    batch.set(profileRef, {
      availabilitySummary: summary,
      currentlyAcceptingStudents: clean.currentlyAcceptingStudents && !clean.temporaryPause,
      maximumActiveStudents: clean.maximumActiveStudents,
      timeZone: clean.timeZone,
      mentorshipFormats: clean.sessionFormats,
      locationPreference: clean.sessionFormats.includes("hybrid")
        ? "hybrid"
        : clean.sessionFormats[0] || "online",
      updatedAt: now,
    }, { merge: true });
    await batch.commit();
    return Response.json({ availability: { ...data, createdAt: serializeMentorDate(data.createdAt), updatedAt: now.toISOString() }, availabilitySummary: summary });
  } catch (error) {
    return Response.json({ error: error.code === "validation_error" ? error.message : "Mentor availability could not be saved" }, { status: error.code === "validation_error" ? 400 : 500 });
  }
}

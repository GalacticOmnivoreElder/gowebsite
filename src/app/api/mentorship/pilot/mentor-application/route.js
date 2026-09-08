export const dynamic = "force-dynamic";

import { saveMentorPilotApplication } from "@/lib/mentorship-pilot-service";
import { requirePilotUser, routeError } from "@/lib/mentorship-pilot-route";
import { getRequestUser } from "@/lib/auth-utils";
import { adminDb } from "@/lib/firebase-admin";
import { serializeMentorApplicationSummary, serializeMentorPilotProfile } from "@/lib/mentorship-pilot";

function resolveMentorApplicationStatus(userStatus, applicationData, profileData) {
  const authoritativeStatuses = {
    approved: "approved",
    temporarily_unavailable: "paused",
    suspended: "suspended",
    rejected: "rejected",
    inactive: "archived",
  };
  return authoritativeStatuses[userStatus]
    || applicationData?.status
    || profileData?.status
    || (userStatus === "applicant" ? "submitted" : null);
}

export async function GET(request) {
  const user = await getRequestUser(request);
  if (!user) return Response.json({ error: "Authentication required" }, { status: 401 });
  try {
    const profileDoc = await adminDb.collection("mentor_profiles").doc(user.uid).get();
    const applicationDoc = await adminDb.collection("mentor_applications").doc(user.uid).get();
    const profileData = profileDoc.exists ? profileDoc.data() : null;
    const applicationData = applicationDoc.exists ? applicationDoc.data() : null;
    const effectiveStatus = resolveMentorApplicationStatus(user.userData?.mentorStatus, applicationData, profileData);
    const effectiveProfile = profileData && effectiveStatus ? { ...profileData, status: effectiveStatus } : profileData;
    const effectiveApplication = effectiveStatus ? { ...(applicationData || {}), status: effectiveStatus } : applicationData;
    return Response.json({
      mentorStatus: user.userData?.mentorStatus || "none",
      profile: effectiveProfile ? serializeMentorPilotProfile(user.uid, effectiveProfile, { admin: false }) : null,
      application: effectiveStatus
        ? serializeMentorApplicationSummary(user.uid, effectiveApplication || {}, effectiveProfile || {})
        : null,
      versions: { conduct: "go-code-of-conduct-v1", terms: "mentor-terms-pilot-v1" },
      consent: {
        conductAccepted: profileData?.conductVersion === "go-code-of-conduct-v1",
        termsAccepted: profileData?.termsVersion === "mentor-terms-pilot-v1",
      },
      privateProfile: effectiveProfile ? {
        topicsNotOffered: effectiveProfile.topicsNotOffered || [],
        accessibilityInformation: effectiveProfile.accessibilityInformation || "",
        conflictOfInterestDeclaration: effectiveProfile.conflictOfInterestDeclaration || "",
      } : null,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return routeError(error, "Mentor application could not be loaded");
  }
}

export async function PATCH(request) {
  const gate = await requirePilotUser(request, "apply_mentor");
  if (gate.response) return gate.response;
  try {
    const body = await request.json().catch(() => ({}));
    return Response.json(await saveMentorPilotApplication({ user: gate.user, input: body, action: body.action === "submit" ? "submit" : "save" }));
  } catch (error) {
    return routeError(error, "Mentor application could not be saved");
  }
}

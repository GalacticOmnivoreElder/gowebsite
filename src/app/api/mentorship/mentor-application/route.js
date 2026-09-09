export const dynamic = "force-dynamic";

import { saveMentorApplication } from "@/lib/mentorship-service";
import { requireMentorshipUser, routeError } from "@/lib/mentorship-route";
import { getRequestUser } from "@/lib/auth-utils";
import { adminDb } from "@/lib/firebase-admin";
import { getMentorApplicationState } from "@/lib/product-settings";
import { MENTOR_CONDUCT_VERSION, MENTOR_TERMS_VERSION, serializeMentorApplicationSummary, serializeMentorProfile } from "@/lib/mentorship";

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
    const [profileDoc, applicationDoc, applicationState] = await Promise.all([
      adminDb.collection("mentor_profiles").doc(user.uid).get(),
      adminDb.collection("mentor_applications").doc(user.uid).get(),
      getMentorApplicationState(),
    ]);
    const profileData = profileDoc.exists ? profileDoc.data() : null;
    const applicationData = applicationDoc.exists ? applicationDoc.data() : null;
    const effectiveStatus = resolveMentorApplicationStatus(user.userData?.mentorStatus, applicationData, profileData);
    const effectiveProfile = profileData && effectiveStatus ? { ...profileData, status: effectiveStatus } : profileData;
    const effectiveApplication = effectiveStatus ? { ...(applicationData || {}), status: effectiveStatus } : applicationData;
    return Response.json({
      mentorStatus: user.userData?.mentorStatus || "none",
      applicationsOpen: applicationState.open,
      profile: effectiveProfile ? serializeMentorProfile(user.uid, effectiveProfile, { admin: false }) : null,
      application: effectiveStatus
        ? serializeMentorApplicationSummary(user.uid, effectiveApplication || {}, effectiveProfile || {})
        : null,
      versions: { conduct: MENTOR_CONDUCT_VERSION, terms: MENTOR_TERMS_VERSION },
      consent: {
        conductAccepted: profileData?.conductVersion === MENTOR_CONDUCT_VERSION,
        termsAccepted: profileData?.termsVersion === MENTOR_TERMS_VERSION,
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
  const gate = await requireMentorshipUser(request, "apply_mentor");
  if (gate.response) return gate.response;
  try {
    const applicationState = await getMentorApplicationState();
    if (!applicationState.open) {
      return Response.json(
        { error: "Mentor applications are not accepting new submissions right now.", code: "mentor_applications_closed" },
        { status: 503 }
      );
    }
    const body = await request.json().catch(() => ({}));
    return Response.json(await saveMentorApplication({ user: gate.user, input: body, action: body.action === "submit" ? "submit" : "save" }));
  } catch (error) {
    return routeError(error, "Mentor application could not be saved");
  }
}

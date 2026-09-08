export const dynamic = "force-dynamic";

import { saveMentorPilotApplication } from "@/lib/mentorship-pilot-service";
import { requirePilotUser, routeError } from "@/lib/mentorship-pilot-route";
import { getRequestUser } from "@/lib/auth-utils";
import { adminDb } from "@/lib/firebase-admin";
import { serializeMentorApplicationSummary, serializeMentorPilotProfile } from "@/lib/mentorship-pilot";

export async function GET(request) {
  const user = await getRequestUser(request);
  if (!user) return Response.json({ error: "Authentication required" }, { status: 401 });
  try {
    const profileDoc = await adminDb.collection("mentor_profiles").doc(user.uid).get();
    const applicationDoc = await adminDb.collection("mentor_applications").doc(user.uid).get();
    const profileData = profileDoc.exists ? profileDoc.data() : null;
    const applicationData = applicationDoc.exists ? applicationDoc.data() : null;
    return Response.json({
      profile: profileData ? serializeMentorPilotProfile(gate.user.uid, profileData, { admin: false }) : null,
      application: applicationData
        ? serializeMentorApplicationSummary(applicationDoc.id, applicationData, profileData || {})
        : profileData
          ? serializeMentorApplicationSummary(user.uid, {}, profileData)
          : null,
      versions: { conduct: "go-code-of-conduct-v1", terms: "mentor-terms-pilot-v1" },
      consent: {
        conductAccepted: profileData?.conductVersion === "go-code-of-conduct-v1",
        termsAccepted: profileData?.termsVersion === "mentor-terms-pilot-v1",
      },
      privateProfile: profileData ? {
        topicsNotOffered: profileData.topicsNotOffered || [],
        accessibilityInformation: profileData.accessibilityInformation || "",
        conflictOfInterestDeclaration: profileData.conflictOfInterestDeclaration || "",
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

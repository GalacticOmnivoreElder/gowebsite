export const dynamic = "force-dynamic";

import { saveMentorPilotApplication } from "@/lib/mentorship-pilot-service";
import { requirePilotUser, routeError } from "@/lib/mentorship-pilot-route";
import { adminDb } from "@/lib/firebase-admin";
import { serializeMentorPilotProfile } from "@/lib/mentorship-pilot";

export async function GET(request) {
  const gate = await requirePilotUser(request, "apply_mentor");
  if (gate.response) return gate.response;
  try {
    const profileDoc = await adminDb.collection("mentor_profiles").doc(gate.user.uid).get();
    const applicationDoc = await adminDb.collection("mentor_applications").doc(gate.user.uid).get();
    const profileData = profileDoc.exists ? profileDoc.data() : null;
    return Response.json({
      profile: profileData ? serializeMentorPilotProfile(gate.user.uid, profileData, { admin: false }) : null,
      application: applicationDoc.exists ? { id: applicationDoc.id, status: applicationDoc.data().status } : null,
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

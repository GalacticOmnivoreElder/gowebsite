import { adminDb } from "@/lib/firebase-admin";
import { getMentorshipConfig } from "@/lib/product-config";

export async function getProductSettings() {
  const snapshot = await adminDb.collection("site_settings").doc("product").get();
  return snapshot.exists ? snapshot.data() : {};
}

export async function getMentorApplicationState() {
  const config = getMentorshipConfig();
  const settings = await getProductSettings().catch(() => ({}));
  return {
    configured: config.featureFlags.mentorApplications,
    open:
      config.featureFlags.mentorApplications &&
      settings.mentorApplicationsOpen !== false,
  };
}

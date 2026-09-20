import { adminDb } from "@/lib/firebase-admin";
import { getMentorshipConfig } from "@/lib/product-config";

export async function getProductSettings() {
  const snapshot = await adminDb.collection("site_settings").doc("product").get();
  return snapshot.exists ? snapshot.data() : {};
}

export async function getMentorApplicationState() {
  const config = getMentorshipConfig();
  // Product settings are an enhancement to the public membership page. Keep
  // a slow or unavailable Firestore connection from blocking the whole page.
  const settings = await Promise.race([
    getProductSettings().catch(() => ({})),
    new Promise((resolve) => setTimeout(() => resolve({}), 1500)),
  ]);
  return {
    configured: config.featureFlags.mentorApplications,
    open:
      config.featureFlags.mentorApplications &&
      settings.mentorApplicationsOpen !== false,
  };
}

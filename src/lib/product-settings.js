import { adminDb } from "@/lib/firebase-admin";
import { areMentorApplicationsOpen, getProductConfig } from "@/lib/product-config";

export async function getProductSettings() {
  const snapshot = await adminDb.collection("site_settings").doc("product").get();
  return snapshot.exists ? snapshot.data() : {};
}

export async function getMentorApplicationState() {
  const config = getProductConfig();
  const settings = await getProductSettings().catch(() => ({}));
  return {
    configured: config.mentorApplicationsConfigured,
    open: areMentorApplicationsOpen(config, settings),
  };
}

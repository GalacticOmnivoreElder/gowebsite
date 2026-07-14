import { adminDb } from "@/lib/firebase-admin";

export async function isWebhookProcessed(webhookId, eventType) {
  try {
    const webhookDoc = await adminDb
      .collection("processed_webhooks")
      .doc(`${eventType}_${webhookId}`)
      .get();

    return webhookDoc.exists;
  } catch (error) {
    console.error("Error checking webhook status:", error);
    return false;
  }
}

export async function markWebhookProcessed(webhookId, eventType, eventData) {
  try {
    await adminDb
      .collection("processed_webhooks")
      .doc(`${eventType}_${webhookId}`)
      .set({
        webhookId,
        eventType,
        processedAt: new Date(),
        eventData: eventData,
        // Auto-delete after 30 days to keep collection clean
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });

    console.log(`✅ Marked webhook ${webhookId} as processed`);
  } catch (error) {
    console.error("Error marking webhook as processed:", error);
  }
}

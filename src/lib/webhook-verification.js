import crypto from "crypto";

export function verifyWebhookSignature(payload, signature, secret) {
  if (!signature || !secret) {
    console.warn(
      "⚠️ Webhook signature verification skipped - missing signature or secret"
    );
    return true; // Allow for development, but log warning
  }

  try {
    // Polar.sh uses HMAC-SHA256 for webhook signatures
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(payload, "utf8")
      .digest("hex");

    // Compare signatures securely
    const providedSignature = signature.replace("sha256=", "");

    const isValid = crypto.timingSafeEqual(
      Buffer.from(expectedSignature, "hex"),
      Buffer.from(providedSignature, "hex")
    );

    if (!isValid) {
      console.error("❌ Webhook signature verification failed");
      console.error("Expected:", expectedSignature);
      console.error("Provided:", providedSignature);
    } else {
      console.log("✅ Webhook signature verified successfully");
    }

    return isValid;
  } catch (error) {
    console.error("❌ Error verifying webhook signature:", error);
    return false;
  }
}

import { NextResponse } from "next/server";
import {
  processResendWebhook,
  verifyResendWebhook,
} from "@/lib/email/resend-webhook";

export async function POST(request) {
  const payload = await request.text();
  const providerEventId = request.headers.get("svix-id");
  try {
    const event = verifyResendWebhook({
      payload,
      headers: {
        id: providerEventId,
        timestamp: request.headers.get("svix-timestamp"),
        signature: request.headers.get("svix-signature"),
      },
      secret: process.env.RESEND_WEBHOOK_SECRET,
    });
    const result = await processResendWebhook({ providerEventId, event });
    return NextResponse.json(result);
  } catch (error) {
    const configurationError =
      error.message === "RESEND_WEBHOOK_SECRET is not configured";
    console.error("Resend webhook processing failed:", {
      providerEventId: providerEventId || null,
      code: configurationError ? "configuration_error" : "invalid_webhook",
    });
    return NextResponse.json(
      { error: configurationError ? "Webhook is not configured" : "Invalid webhook" },
      { status: configurationError ? 503 : 400 }
    );
  }
}

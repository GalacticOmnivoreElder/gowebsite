import { NextResponse } from "next/server";
import { getRequestUser } from "@/lib/auth-utils";
import { enqueueEmailEvent } from "@/lib/email";
import { hashValue } from "@/lib/email/utils";

const MAX_FIELD_LENGTH = 200;
const MAX_MESSAGE_LENGTH = 5000;

function cleanText(value, maxLength) {
  return typeof value === "string"
    ? value.replace(/[\r\n]+/g, " ").trim().slice(0, maxLength)
    : "";
}

export async function POST(request) {
  try {
    const user = await getRequestUser(request);

    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    if (!user.admin) {
      return NextResponse.json(
        { error: "Platform admin access required" },
        { status: 403 }
      );
    }

    if (!user.email) {
      return NextResponse.json(
        { error: "The admin account does not have an email address" },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const name = cleanText(body.name, MAX_FIELD_LENGTH) || "Unknown";
    const contactEmail = cleanText(body.email, MAX_FIELD_LENGTH) || "Not provided";
    const subject = cleanText(body.subject, MAX_FIELD_LENGTH) || "No subject";
    const message = cleanText(body.message, MAX_MESSAGE_LENGTH);

    if (!message) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    const result = await enqueueEmailEvent({
      type: "admin.onboarding_note",
      eventId: hashValue(
        `${user.uid}:${name}:${contactEmail}:${subject}:${message}`
      ),
      userId: user.uid,
      recipient: user.email,
      data: { name, contactEmail, subject, message },
    });

    return NextResponse.json({
      success: true,
      queued: result.created,
      emailJobId: result.id,
    });
  } catch (error) {
    console.error("Error sending onboarding note:", error);
    return NextResponse.json(
      { error: "Failed to send onboarding note" },
      { status: 500 }
    );
  }
}

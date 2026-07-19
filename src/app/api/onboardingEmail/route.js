import { NextResponse } from "next/server";
import { getRequestUser } from "@/lib/auth-utils";
import { getResend } from "@/lib/resend";

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

    const result = await getResend().emails.send({
      from: "Galactic Omnivore <onboarding@galacticomnivore.com>",
      to: user.email,
      subject: `Onboarding note: ${subject}`,
      text: `Name: ${name}\nContact email: ${contactEmail}\n\n${message}`,
    });

    if (result.error) {
      throw new Error(result.error.message || "Resend rejected the email");
    }

    return NextResponse.json({
      success: true,
      emailId: result.data?.id || null,
    });
  } catch (error) {
    console.error("Error sending onboarding note:", error);
    return NextResponse.json(
      { error: "Failed to send onboarding note" },
      { status: 500 }
    );
  }
}

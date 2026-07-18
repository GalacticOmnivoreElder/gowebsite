import { NextResponse } from "next/server";
import { getResend } from "@/lib/resend";

export async function POST(request) {
  try {
    const { name, email, subject, message } = await request.json();

    // Create email content
    const emailContent = `
New Contact Form Submission

From: ${name}
Email: ${email}
Subject: ${subject}

Message:
--------
${message}

Date: ${new Date().toLocaleString()}
    `;

    // Send email
    await getResend().emails.send({
      from: "onboarding@galacticomnivore.com",
      to: email,
      subject: `Onboarding: ${subject}`,
      text: emailContent,
      reply_to: email,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error processing contact form:", error);
    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 }
    );
  }
}

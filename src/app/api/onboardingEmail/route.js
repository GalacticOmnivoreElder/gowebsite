import { Resend } from "resend";
import { NextResponse } from "next/server";

const resend = new Resend(process.env.RESEND_API_KEY);

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
    await resend.emails.send({
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

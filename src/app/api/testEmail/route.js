import { Resend } from "resend";
import { NextResponse } from "next/server";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request) {
  try {
    const { email } = await request.json();

    console.log("=== TEST EMAIL API CALLED ===");
    console.log("Test email to:", email);
    console.log("RESEND_API_KEY exists:", !!process.env.RESEND_API_KEY);
    console.log(
      "RESEND_API_KEY preview:",
      process.env.RESEND_API_KEY?.substring(0, 10) + "..."
    );

    // Simple test email
    const testResult = await resend.emails.send({
      from: "onboarding@galacticomnivore.com",
      to: email,
      subject: "Test Email from Galactic Omnivore",
      html: `
        <h1>Test Email</h1>
        <p>This is a test email to verify Resend is working.</p>
        <p>Timestamp: ${new Date().toISOString()}</p>
      `,
      text: `Test Email\n\nThis is a test email to verify Resend is working.\nTimestamp: ${new Date().toISOString()}`,
    });

    console.log("=== TEST EMAIL RESEND RESPONSE ===");
    console.log("Full response:", JSON.stringify(testResult, null, 2));

    return NextResponse.json({
      success: true,
      result: testResult,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("=== TEST EMAIL ERROR ===");
    console.error("Error:", error);
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);

    return NextResponse.json(
      {
        error: "Test email failed",
        details: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: "Test email endpoint - use POST with { email: 'your@email.com' }",
    hasApiKey: !!process.env.RESEND_API_KEY,
    timestamp: new Date().toISOString(),
  });
}

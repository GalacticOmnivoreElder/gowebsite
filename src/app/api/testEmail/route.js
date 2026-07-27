import { NextResponse } from "next/server";
import { getRequestUser } from "@/lib/auth-utils";
import { getResend } from "@/lib/resend";

async function getAdmin(request) {
  const user = await getRequestUser(request);

  if (!user) {
    return {
      response: NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      ),
    };
  }

  if (!user.admin) {
    return {
      response: NextResponse.json(
        { error: "Platform admin access required" },
        { status: 403 }
      ),
    };
  }

  if (!user.email) {
    return {
      response: NextResponse.json(
        { error: "The admin account does not have an email address" },
        { status: 400 }
      ),
    };
  }

  return { user };
}

export async function POST(request) {
  const { response, user } = await getAdmin(request);
  if (response) return response;

  try {
    const timestamp = new Date().toISOString();
    const production =
      process.env.VERCEL_ENV
        ? process.env.VERCEL_ENV === "production"
        : process.env.NODE_ENV === "production";
    const recipient = production
      ? user.email
      : process.env.EMAIL_TEST_RECIPIENT;
    if (!recipient) {
      return NextResponse.json(
        { error: "Set EMAIL_TEST_RECIPIENT for non-production delivery tests" },
        { status: 503 }
      );
    }
    const result = await getResend().emails.send({
      from:
        process.env.EMAIL_FROM_TRANSACTIONAL ||
        "Galactic Omnivore <disabled@example.invalid>",
      to: recipient,
      subject: `${
        production ? "" : `[${process.env.VERCEL_ENV || "development"}] `
      }Galactic Omnivore email delivery test`,
      html: `<h1>Email delivery test</h1><p>Sent at ${timestamp}</p>`,
      text: `Email delivery test\n\nSent at ${timestamp}`,
    });

    if (result.error) {
      throw new Error(result.error.message || "Resend rejected the email");
    }

    return NextResponse.json({
      success: true,
      emailId: result.data?.id || null,
      timestamp,
    });
  } catch (error) {
    console.error("Email delivery test failed:", error);
    return NextResponse.json(
      { error: "Email delivery test failed" },
      { status: 500 }
    );
  }
}

export async function GET(request) {
  const { response } = await getAdmin(request);
  if (response) return response;

  return NextResponse.json({
    configured: Boolean(
      process.env.RESEND_API_KEY &&
        (process.env.VERCEL_ENV === "production" ||
          (!process.env.VERCEL_ENV &&
            process.env.NODE_ENV === "production") ||
          process.env.EMAIL_TEST_RECIPIENT)
    ),
  });
}

import { NextResponse } from "next/server";
import { getRequestUser } from "@/lib/auth-utils";
import { getResend } from "@/lib/resend";

const FROM_ADDRESS = "Galactic Omnivore <onboarding@galacticomnivore.com>";

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
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

    if (!user.email) {
      return NextResponse.json(
        { error: "The signed-in account does not have an email address" },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const displayName =
      user.userData?.username ||
      body.username ||
      body.name ||
      user.email.split("@")[0] ||
      "Creator";
    const safeDisplayName = escapeHtml(displayName);
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL || "https://www.galacticomnivore.com";
    const profileUrl = new URL("/profile", siteUrl).toString();

    const html = `
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Welcome to Galactic Omnivore</title>
  </head>
  <body style="margin:0;padding:0;background:#0a0a0a;color:#f5f5f5;font-family:Arial,sans-serif;line-height:1.6;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#0a0a0a;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#171717;border:1px solid #343434;">
            <tr>
              <td style="padding:28px 32px;border-top:4px solid #ca2280;">
                <p style="margin:0 0 8px;color:#ca2280;font-size:13px;font-weight:700;text-transform:uppercase;">Galactic Omnivore</p>
                <h1 style="margin:0 0 18px;color:#ffffff;font-size:28px;line-height:1.2;">Welcome, ${safeDisplayName}</h1>
                <p style="margin:0 0 18px;color:#d4d4d4;">Your Galactic Omnivore account is ready. Complete your profile so project creators and collaborators can discover your work, skills, and experience.</p>
                <p style="margin:0 0 26px;color:#d4d4d4;">You can browse public projects now and choose a membership whenever you are ready to apply or create a project.</p>
                <a href="${profileUrl}" style="display:inline-block;background:#ca2280;color:#ffffff;padding:12px 20px;text-decoration:none;font-weight:700;">Complete your profile</a>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px;border-top:1px solid #343434;color:#8f8f8f;font-size:13px;">
                This email was sent because an account was created for ${escapeHtml(user.email)}.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

    const text = `Welcome to Galactic Omnivore, ${displayName}.

Your account is ready. Complete your profile so project creators and collaborators can discover your work, skills, and experience.

Complete your profile: ${profileUrl}

This email was sent because an account was created for ${user.email}.`;

    const result = await getResend().emails.send({
      from: FROM_ADDRESS,
      to: user.email,
      subject: "Welcome to Galactic Omnivore",
      html,
      text,
    });

    if (result.error) {
      throw new Error(result.error.message || "Resend rejected the email");
    }

    return NextResponse.json({
      success: true,
      emailId: result.data?.id || null,
    });
  } catch (error) {
    console.error("Error sending welcome email:", error);
    return NextResponse.json(
      { error: "Failed to send welcome email" },
      { status: 500 }
    );
  }
}

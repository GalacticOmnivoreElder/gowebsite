import { getResend } from "@/lib/resend";

const FROM_ADDRESS = "Galactic Omnivore <membership@galacticomnivore.com>";

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function formatPurchaseAmount(amount, currency) {
  if (amount === null || amount === undefined || amount === "") return null;
  const numericAmount = Number(amount);
  const normalizedCurrency = String(currency || "").toUpperCase();
  if (!Number.isFinite(numericAmount) || !normalizedCurrency) return null;

  try {
    return new Intl.NumberFormat("en", {
      style: "currency",
      currency: normalizedCurrency,
    }).format(numericAmount / 100);
  } catch {
    return `${(numericAmount / 100).toFixed(2)} ${normalizedCurrency}`;
  }
}

export async function sendPurchaseConfirmationEmail(
  {
    amount,
    currency,
    displayName,
    interval,
    orderId,
    tier,
    to,
  },
  resendClient = getResend()
) {
  if (!to) throw new Error("Purchase confirmation requires an email address");

  const planName = tier === "company" ? "GO Business" : "GO Community";
  const safeName = escapeHtml(displayName || "GO member");
  const safePlanName = escapeHtml(planName);
  const safeInterval = escapeHtml(interval || "membership");
  const formattedAmount = formatPurchaseAmount(amount, currency);
  const safeAmount = escapeHtml(formattedAmount || "Confirmed by Polar");
  const safeOrderId = escapeHtml(orderId || "");
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://www.galacticomnivore.com";
  const billingUrl = new URL("/billing", siteUrl).toString();

  const html = `
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Your Galactic Omnivore membership is active</title>
  </head>
  <body style="margin:0;padding:0;background:#0a0a0a;color:#f5f5f5;font-family:Arial,sans-serif;line-height:1.6;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#0a0a0a;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#171717;border:1px solid #343434;">
            <tr>
              <td style="padding:28px 32px;border-top:4px solid #ca2280;">
                <p style="margin:0 0 8px;color:#ca2280;font-size:13px;font-weight:700;text-transform:uppercase;">Galactic Omnivore</p>
                <h1 style="margin:0 0 18px;color:#ffffff;font-size:28px;line-height:1.2;">Membership active</h1>
                <p style="margin:0 0 18px;color:#d4d4d4;">Hi ${safeName}, your ${safePlanName} ${safeInterval} subscription is active.</p>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 24px;border:1px solid #343434;">
                  <tr>
                    <td style="padding:10px 14px;color:#a3a3a3;">Payment</td>
                    <td align="right" style="padding:10px 14px;color:#ffffff;font-weight:700;">${safeAmount}</td>
                  </tr>
                  ${
                    safeOrderId
                      ? `<tr><td style="padding:10px 14px;color:#a3a3a3;border-top:1px solid #343434;">Order</td><td align="right" style="padding:10px 14px;color:#ffffff;border-top:1px solid #343434;">${safeOrderId}</td></tr>`
                      : ""
                  }
                </table>
                <a href="${billingUrl}" style="display:inline-block;background:#ca2280;color:#ffffff;padding:12px 20px;text-decoration:none;font-weight:700;">View membership</a>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px;border-top:1px solid #343434;color:#8f8f8f;font-size:13px;">
                Polar securely processed this payment. Manage renewal and billing from your GO account.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const text = `Hi ${displayName || "GO member"},

Your ${planName} ${interval || "membership"} subscription is active.
Payment: ${formattedAmount || "Confirmed by Polar"}
${orderId ? `Order: ${orderId}\n` : ""}
View membership: ${billingUrl}

Polar securely processed this payment.`;

  const result = await resendClient.emails.send({
    from: FROM_ADDRESS,
    to,
    subject: `${planName} membership active`,
    html,
    text,
  });

  if (result.error) {
    throw new Error(result.error.message || "Resend rejected the email");
  }

  return { emailId: result.data?.id || null };
}

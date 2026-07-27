import { absoluteSiteUrl, escapeHtml } from "../utils";

const BRAND = {
  background: "#0a0a0a",
  card: "#171717",
  border: "#343434",
  accent: "#ca2280",
  text: "#f5f5f5",
  muted: "#c4c4c4",
};

export function renderEmailLayout({
  preheader,
  heading,
  bodyHtml,
  ctaLabel,
  ctaUrl,
  footerHtml,
  marketing = false,
  preferencesUrl,
  unsubscribeUrl,
}) {
  const safePreheader = escapeHtml(preheader || heading);
  const safeHeading = escapeHtml(heading);
  const safeCtaLabel = escapeHtml(ctaLabel);
  const safeCtaUrl = escapeHtml(ctaUrl);
  const supportUrl = escapeHtml(absoluteSiteUrl("/contact"));
  const legalLinks = marketing
    ? `<p style="margin:12px 0 0;">
        <a href="${escapeHtml(preferencesUrl)}" style="color:#c4c4c4;">Manage preferences</a>
        &nbsp;·&nbsp;
        <a href="${escapeHtml(unsubscribeUrl)}" style="color:#c4c4c4;">Unsubscribe</a>
      </p>`
    : "";

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${safeHeading}</title>
  </head>
  <body style="margin:0;padding:0;background:${BRAND.background};color:${BRAND.text};font-family:Arial,sans-serif;line-height:1.6;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${safePreheader}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${BRAND.background};padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:${BRAND.card};border:1px solid ${BRAND.border};">
            <tr>
              <td style="padding:28px 32px;border-top:4px solid ${BRAND.accent};">
                <p style="margin:0 0 8px;color:${BRAND.accent};font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;">Galactic Omnivore</p>
                <h1 style="margin:0 0 18px;color:#ffffff;font-size:28px;line-height:1.2;">${safeHeading}</h1>
                <div style="color:${BRAND.muted};font-size:16px;">${bodyHtml}</div>
                ${
                  ctaLabel && ctaUrl
                    ? `<p style="margin:26px 0 0;"><a href="${safeCtaUrl}" style="display:inline-block;background:${BRAND.accent};color:#ffffff;padding:12px 20px;text-decoration:none;font-weight:700;">${safeCtaLabel}</a></p>`
                    : ""
                }
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px;border-top:1px solid ${BRAND.border};color:#8f8f8f;font-size:13px;">
                ${footerHtml || `Need help? <a href="${supportUrl}" style="color:#c4c4c4;">Contact Galactic Omnivore</a>.`}
                ${legalLinks}
                ${
                  marketing
                    ? `<p style="margin:12px 0 0;">${escapeHtml(
                        process.env.EMAIL_MARKETING_ADDRESS ||
                          "Galactic Omnivore, Skopje, North Macedonia"
                      )}</p>`
                    : ""
                }
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

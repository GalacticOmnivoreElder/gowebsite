import crypto from "crypto";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(value) {
  if (typeof value !== "string") return "";
  const normalized = value.trim().toLowerCase();
  return EMAIL_PATTERN.test(normalized) ? normalized : "";
}

export function maskEmail(value) {
  const normalized = normalizeEmail(value);
  if (!normalized) return "[invalid-email]";
  const [local, domain] = normalized.split("@");
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}${"*".repeat(Math.max(1, local.length - visible.length))}@${domain}`;
}

export function hashValue(value) {
  return crypto.createHash("sha256").update(String(value)).digest("hex");
}

export function createOpaqueToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString("base64url");
}

export function createNewsletterConfirmationVersion() {
  return crypto.randomBytes(16).toString("base64url");
}

export function createNewsletterConfirmationToken(subscriberId, version) {
  const secret = process.env.NEWSLETTER_TOKEN_SECRET;
  if (!secret) {
    throw new Error("NEWSLETTER_TOKEN_SECRET is not configured");
  }
  if (!subscriberId || !version) {
    throw new Error("Newsletter confirmation identity is required");
  }
  return crypto
    .createHmac("sha256", secret)
    .update(`newsletter-confirm:${subscriberId}:${version}`)
    .digest("base64url");
}

export function hashOpaqueToken(token) {
  const secret = process.env.NEWSLETTER_TOKEN_SECRET;
  if (!secret) {
    throw new Error("NEWSLETTER_TOKEN_SECRET is not configured");
  }
  return crypto
    .createHmac("sha256", secret)
    .update(String(token))
    .digest("hex");
}

export function createSignedActionToken(
  subject,
  version = 1,
  expiresInSeconds = 365 * 24 * 60 * 60
) {
  const secret = process.env.NEWSLETTER_TOKEN_SECRET;
  if (!secret) {
    throw new Error("NEWSLETTER_TOKEN_SECRET is not configured");
  }
  const payload = Buffer.from(
    JSON.stringify({
      sub: String(subject),
      ver: Number(version) || 1,
      exp: Math.floor(Date.now() / 1000) + expiresInSeconds,
    })
  ).toString("base64url");
  const signature = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("base64url");
  return `${payload}.${signature}`;
}

export function verifySignedActionToken(token) {
  const secret = process.env.NEWSLETTER_TOKEN_SECRET;
  if (!secret || typeof token !== "string") return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;

  const expected = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest();
  let actual;
  try {
    actual = Buffer.from(signature, "base64url");
  } catch {
    return null;
  }
  if (actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) {
    return null;
  }

  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (!parsed.sub || !parsed.exp || parsed.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function makeEmailJobId({ type, eventId, userId, recipient }) {
  const recipientKey = userId || hashValue(normalizeEmail(recipient));
  return hashValue(`${type}:${eventId}:${recipientKey}`);
}

export function makeIdempotencyKey({ type, eventId, userId, recipient }) {
  const recipientKey = userId || hashValue(normalizeEmail(recipient)).slice(0, 16);
  return `${type.replaceAll(".", "-")}/${eventId}/${recipientKey}`.slice(0, 256);
}

export function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function getSiteUrl() {
  const configured =
    process.env.NEXT_PUBLIC_SITE_URL || "https://www.galacticomnivore.com";
  try {
    return new URL(configured).origin;
  } catch {
    return "https://www.galacticomnivore.com";
  }
}

export function absoluteSiteUrl(path = "/") {
  return new URL(path, `${getSiteUrl()}/`).toString();
}

export function sanitizeTag(value, fallback = "unknown") {
  const sanitized = String(value ?? fallback)
    .replace(/[^A-Za-z0-9_-]/g, "_")
    .slice(0, 256);
  return sanitized || fallback;
}

export function firestoreDateToDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value.toDate === "function") return value.toDate();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function asIsoString(value) {
  return firestoreDateToDate(value)?.toISOString() || null;
}

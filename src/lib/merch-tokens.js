import crypto from "crypto";

export function merchToken(id, version, purpose, expires) {
  const secret = process.env.NEWSLETTER_TOKEN_SECRET;
  if (!secret) throw new Error("Merch email configuration is missing");
  const payload = Buffer.from(JSON.stringify({ id, version, purpose, expires })).toString("base64url");
  return `${payload}.${crypto.createHmac("sha256", secret).update(`merch:${payload}`).digest("base64url")}`;
}
export function readMerchToken(token, purpose) {
  try {
    if (typeof token !== "string" || token.length > 1000) return null;
    const [payload, signature, extra] = token.split(".");
    if (!payload || !signature || extra) return null;
    const data = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (data.purpose !== purpose || !/^[a-f0-9]{64}$/.test(data.id) || typeof data.version !== "string" || data.expires <= Date.now()) return null;
    const expected = merchToken(data.id, data.version, purpose, data.expires).split(".")[1];
    const left = Buffer.from(expected); const right = Buffer.from(signature);
    return left.length === right.length && crypto.timingSafeEqual(left, right) ? data : null;
  } catch { return null; }
}

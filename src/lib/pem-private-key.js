/**
 * Vercel/env-safe PEM private key cleanup.
 * Google service-account keys fail on Vercel when newlines, quotes, or PKCS#1 wrapping get mangled.
 */
export function normalizePemPrivateKey(raw) {
  if (!raw || typeof raw !== "string") return "";

  let key = raw.trim();
  if (key.charCodeAt(0) === 0xfeff) key = key.slice(1).trim();

  if (
    (key.startsWith('"') && key.endsWith('"')) ||
    (key.startsWith("'") && key.endsWith("'"))
  ) {
    key = key.slice(1, -1).trim();
  }

  if (key.startsWith("{") && key.includes("private_key")) {
    try {
      const parsed = JSON.parse(key);
      if (typeof parsed.private_key === "string") key = parsed.private_key;
    } catch {
      // keep going with the original string
    }
  }

  // Vercel/.env may store literal \n, \r\n, or double-escaped \\n
  key = key.replace(/\\r\\n/g, "\n").replace(/\\\\n/g, "\n").replace(/\\n/g, "\n").replace(/\\r/g, "\n");
  key = key.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  key = key.replace(/[\u2013\u2014]/g, "-");
  key = reflowPem(key);
  return key.trim();
}

export function inspectNormalizedPem(raw) {
  const normalized = normalizePemPrivateKey(raw);
  const lines = normalized ? normalized.split("\n") : [];
  return {
    normalizedLength: normalized.length,
    lineCount: lines.length,
    hasBeginPrivateKey: normalized.includes("BEGIN PRIVATE KEY"),
    hasBeginRsaPrivateKey: normalized.includes("BEGIN RSA PRIVATE KEY"),
    hasEndPrivateKey: /-----END (RSA )?PRIVATE KEY-----/.test(normalized),
    firstLine: lines[0] || null,
    lastLine: lines[lines.length - 1] || null,
  };
}

function reflowPem(key) {
  const match = key.match(/-----BEGIN ([A-Z0-9 ]+)-----\s*([\s\S]*?)\s*-----END \1-----/);
  if (!match) return key;

  const label = match[1];
  const body = match[2].replace(/[\s\r\n]+/g, "");
  if (!body) return key;

  const lines = body.match(/.{1,64}/g) || [];
  return `-----BEGIN ${label}-----\n${lines.join("\n")}\n-----END ${label}-----`;
}

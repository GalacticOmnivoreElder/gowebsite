import { readFileSync } from "fs";
import { resolve } from "path";
import {
  initializeApp,
  getApps,
  cert,
  applicationDefault,
} from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

/*
 * What is the "private key" string?
 *
 * Firebase gives you a JSON file from "Generate new private key". Open it in a text editor.
 * There is a field "private_key" whose value is one long text value. It always contains these
 * two lines (with 5 dashes on each side):
 *   -----BEGIN PRIVATE KEY-----
 *   -----END PRIVATE KEY-----
 * Between them is random-looking letters/numbers (base64). That whole block is what Google
 * needs to prove the server is allowed to use Firebase Admin. People call that text shape
 * "PEM" — you can ignore the acronym; it's just a standard way to store a key as text.
 *
 * In .env you normally put that whole block on ONE line, with \n where the line breaks were
 * in the JSON file, OR use FIREBASE_PRIVATE_KEY_BASE64 (same text, base64-encoded = one safe
 * line with no quotes/newline headaches on Windows).
 */

/**
 * True when the failure is server credentials — not the user's login token.
 */
export function isFirebaseAdminSetupError(err) {
  const code = err?.code || err?.errorInfo?.code;
  const msg = err?.message || String(err || "");
  return (
    code === "app/invalid-credential" ||
    /Failed to parse private key|Invalid PEM|invalid-credential|ENOENT|EACCES/i.test(
      msg
    )
  );
}

/** Decode private key for Firebase Admin: plain .env string or base64 of that same text. */
function decodePrivateKeyFromEnv() {
  const b64 = process.env.FIREBASE_PRIVATE_KEY_BASE64?.trim();
  if (b64) {
    try {
      return Buffer.from(b64, "base64").toString("utf8");
    } catch {
      throw new Error(
        "FIREBASE_PRIVATE_KEY_BASE64 is not valid base64. Encode the full private key text (UTF-8) as base64."
      );
    }
  }

  return process.env.FIREBASE_PRIVATE_KEY;
}

function normalizePrivateKey(raw) {
  if (!raw || typeof raw !== "string") return raw;
  let key = raw.trim();
  if (key.charCodeAt(0) === 0xfeff) {
    key = key.slice(1).trim();
  }

  // Straight/smart quotes around the whole value (common in .env mistakes)
  if (
    (key.startsWith('"') && key.endsWith('"')) ||
    (key.startsWith("'") && key.endsWith("'"))
  ) {
    key = key.slice(1, -1);
  }

  // If they pasted JSON from the service account file into the var by mistake
  if (key.startsWith("{") && key.includes("private_key")) {
    try {
      const o = JSON.parse(key);
      if (typeof o.private_key === "string") {
        key = o.private_key;
      }
    } catch {
      // not JSON; continue with key as-is
    }
  }

  // Turn the two characters backslash + n into real line breaks (normal .env one-line style)
  let prev;
  do {
    prev = key;
    key = key.replace(/\\n/g, "\n");
  } while (key !== prev && key.includes("\\n"));

  key = key.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  // Fancy dashes sometimes break the BEGIN/END lines when copy-pasting
  key = key.replace(/[\u2013\u2014]/g, "-");

  return key.trim();
}

function assertStartsLikeFirebasePrivateKey(privateKey) {
  const ok =
    privateKey?.includes("BEGIN PRIVATE KEY") ||
    privateKey?.includes("BEGIN RSA PRIVATE KEY");
  if (!ok) {
    throw new Error(
      'FIREBASE_PRIVATE_KEY must contain the text block from the JSON field "private_key" (with lines starting -----BEGIN PRIVATE KEY-----). Or set FIREBASE_PRIVATE_KEY_BASE64 to base64(UTF-8 of that same text).'
    );
  }
}

function certFromServiceAccountJson(sa) {
  return cert(sa);
}

function getAdminCredential() {
  /*
   * IMPORTANT: Firebase_* from .env must win over GOOGLE_APPLICATION_CREDENTIALS.
   * Many PCs have GAC set globally (gcloud, old installs). That file is NOT your
   * Firebase key → silent wrong credentials and 503. We only use GAC if explicit
   * Firebase env vars are not provided.
   */
  const saPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH?.trim();
  if (saPath) {
    try {
      const absolute = resolve(process.cwd(), saPath);
      const raw = readFileSync(absolute, "utf8");
      const sa = JSON.parse(raw);
      return certFromServiceAccountJson(sa);
    } catch (e) {
      throw new Error(
        `FIREBASE_SERVICE_ACCOUNT_PATH (${saPath}): ${e.message}`
      );
    }
  }

  const jsonEnv = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  if (jsonEnv) {
    try {
      const sa = JSON.parse(jsonEnv);
      return certFromServiceAccountJson(sa);
    } catch (e) {
      throw new Error(
        `FIREBASE_SERVICE_ACCOUNT_JSON is invalid JSON: ${e.message}`
      );
    }
  }

  const projectId = process.env.FIREBASE_PROJECT_ID?.trim();
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
  const privateKey = normalizePrivateKey(decodePrivateKeyFromEnv());

  if (projectId && clientEmail && privateKey) {
    assertStartsLikeFirebasePrivateKey(privateKey);
    return cert({ projectId, clientEmail, privateKey });
  }

  if (process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim()) {
    return applicationDefault();
  }

  throw new Error(
    "Firebase Admin: set FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY (or FIREBASE_PRIVATE_KEY_BASE64), or FIREBASE_SERVICE_ACCOUNT_PATH / FIREBASE_SERVICE_ACCOUNT_JSON, or GOOGLE_APPLICATION_CREDENTIALS"
  );
}

let cachedApp = null;

function getFirebaseAdminApp() {
  if (cachedApp) return cachedApp;
  /*
   * Do not pass projectId from FIREBASE_PROJECT_ID / GCLOUD_PROJECT here.
   * A global GCLOUD_PROJECT (from gcloud) often points at a different GCP project
   * than Firebase → Firestore RPC gets UNAUTHENTICATED while verifyIdToken still works.
   * The Admin SDK takes the project from the service account credential.
   */
  cachedApp =
    getApps().length === 0
      ? initializeApp({ credential: getAdminCredential() })
      : getApps()[0];
  return cachedApp;
}

function proxyService(realGetter) {
  return new Proxy(
    {},
    {
      get(_, prop) {
        const real = realGetter();
        const value = Reflect.get(real, prop, real);
        if (typeof value === "function") {
          return value.bind(real);
        }
        return value;
      },
    }
  );
}

export const adminAuth = proxyService(() => getAuth(getFirebaseAdminApp()));

export const adminDb = proxyService(() =>
  getFirestore(getFirebaseAdminApp())
);

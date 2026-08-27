const SERVICE_ACCOUNT_EMAIL_PATTERN =
  /@[^@\s]+\.iam\.gserviceaccount\.com$/i;

function trimmed(value) {
  return typeof value === "string" ? value.trim() : "";
}

function inspectPrivateKey(value) {
  const raw = trimmed(value);
  if (!raw) {
    return {
      present: false,
      format: "missing",
      newlineStyle: "none",
      hasOuterQuotes: false,
    };
  }

  const hasOuterQuotes =
    (raw.startsWith('"') && raw.endsWith('"')) ||
    (raw.startsWith("'") && raw.endsWith("'"));
  const unwrapped = hasOuterQuotes ? raw.slice(1, -1).trim() : raw;
  const normalized = unwrapped.replace(/\\n/g, "\n");
  const hasPkcs8Header = normalized.startsWith("-----BEGIN PRIVATE KEY-----");
  const hasPkcs8Footer = normalized.endsWith("-----END PRIVATE KEY-----");

  let format = "unrecognized";
  if (hasPkcs8Header && hasPkcs8Footer) {
    format = "pkcs8_pem";
  } else if (
    normalized.startsWith("-----BEGIN RSA PRIVATE KEY-----") ||
    normalized.endsWith("-----END RSA PRIVATE KEY-----")
  ) {
    format = "pkcs1_pem_unsupported";
  } else if (hasPkcs8Header || hasPkcs8Footer) {
    format = "incomplete_pkcs8_pem";
  }

  return {
    present: true,
    format,
    newlineStyle: raw.includes("\\n")
      ? "escaped"
      : raw.includes("\n")
        ? "multiline"
        : "single_line",
    hasOuterQuotes,
  };
}

function inspectServiceAccountJson(value) {
  const raw = trimmed(value);
  if (!raw) {
    return {
      present: false,
      parseStatus: "missing",
      hasClientEmail: false,
      clientEmailLooksLikeServiceAccount: false,
      hasPrivateKey: false,
      privateKey: inspectPrivateKey(""),
      usable: false,
    };
  }

  try {
    const parsed = JSON.parse(raw);
    const clientEmail = trimmed(parsed?.client_email);
    const privateKey = inspectPrivateKey(parsed?.private_key);
    return {
      present: true,
      parseStatus: "valid_json",
      hasClientEmail: Boolean(clientEmail),
      clientEmailLooksLikeServiceAccount:
        SERVICE_ACCOUNT_EMAIL_PATTERN.test(clientEmail),
      hasPrivateKey: privateKey.present,
      privateKey,
      usable: Boolean(clientEmail && privateKey.present),
    };
  } catch {
    return {
      present: true,
      parseStatus: "invalid_json",
      hasClientEmail: false,
      clientEmailLooksLikeServiceAccount: false,
      hasPrivateKey: false,
      privateKey: inspectPrivateKey(""),
      usable: false,
    };
  }
}

export function getGoEventsEnvironmentDiagnostics(env = process.env) {
  const publicCalendarId = trimmed(env.GO_EVENTS_PUBLIC_CALENDAR_ID);
  const membersCalendarId = trimmed(env.GO_EVENTS_MEMBERS_CALENDAR_ID);
  const timezone = trimmed(env.GO_EVENTS_TIMEZONE);
  const apiKeyPresent = Boolean(trimmed(env.GOOGLE_CALENDAR_API_KEY));
  const serviceAccountJson = inspectServiceAccountJson(
    env.GOOGLE_CALENDAR_SERVICE_ACCOUNT_JSON
  );
  const clientEmail = trimmed(env.GOOGLE_CALENDAR_CLIENT_EMAIL);
  const splitPrivateKey = inspectPrivateKey(
    env.GOOGLE_CALENDAR_PRIVATE_KEY
  );
  const splitCredentialUsable = Boolean(clientEmail && splitPrivateKey.present);

  let selectedCredentialMode = "none";
  if (
    serviceAccountJson.present &&
    serviceAccountJson.parseStatus === "invalid_json"
  ) {
    selectedCredentialMode = "service_account_json_invalid";
  } else if (serviceAccountJson.usable) {
    selectedCredentialMode = "service_account_json";
  } else if (splitCredentialUsable) {
    selectedCredentialMode = "split_service_account";
  } else if (
    serviceAccountJson.present ||
    clientEmail ||
    splitPrivateKey.present
  ) {
    selectedCredentialMode = "partial_or_invalid";
  }

  const selectedPrivateKey =
    selectedCredentialMode === "service_account_json"
      ? serviceAccountJson.privateKey
      : splitPrivateKey;
  const selectedPrivateKeyVariable =
    selectedCredentialMode === "service_account_json"
      ? "GOOGLE_CALENDAR_SERVICE_ACCOUNT_JSON"
      : "GOOGLE_CALENDAR_PRIVATE_KEY";
  const serviceCredentialPresent = [
    "service_account_json",
    "split_service_account",
  ].includes(selectedCredentialMode);
  const serviceCredentialFormatReady = Boolean(
    serviceCredentialPresent &&
      selectedPrivateKey.format === "pkcs8_pem" &&
      !selectedPrivateKey.hasOuterQuotes
  );
  const blockingCredentialConfiguration = Boolean(
    selectedCredentialMode === "service_account_json_invalid" ||
      (serviceCredentialPresent && !serviceCredentialFormatReady)
  );
  const issues = [];

  if (serviceAccountJson.present && serviceAccountJson.parseStatus === "invalid_json") {
    issues.push("GOOGLE_CALENDAR_SERVICE_ACCOUNT_JSON_INVALID_JSON");
  }
  if (serviceAccountJson.present && serviceAccountJson.parseStatus === "valid_json") {
    if (!serviceAccountJson.hasClientEmail) {
      issues.push("GOOGLE_CALENDAR_SERVICE_ACCOUNT_JSON_CLIENT_EMAIL_MISSING");
    }
    if (!serviceAccountJson.hasPrivateKey) {
      issues.push("GOOGLE_CALENDAR_SERVICE_ACCOUNT_JSON_PRIVATE_KEY_MISSING");
    }
  }
  if (clientEmail && !splitPrivateKey.present) {
    issues.push("GOOGLE_CALENDAR_PRIVATE_KEY_MISSING");
  }
  if (!clientEmail && splitPrivateKey.present) {
    issues.push("GOOGLE_CALENDAR_CLIENT_EMAIL_MISSING");
  }
  if (clientEmail && !SERVICE_ACCOUNT_EMAIL_PATTERN.test(clientEmail)) {
    issues.push("GOOGLE_CALENDAR_CLIENT_EMAIL_FORMAT_UNEXPECTED");
  }
  if (selectedPrivateKey.present && selectedPrivateKey.hasOuterQuotes) {
    issues.push(
      selectedPrivateKeyVariable === "GOOGLE_CALENDAR_SERVICE_ACCOUNT_JSON"
        ? "GOOGLE_CALENDAR_SERVICE_ACCOUNT_JSON_PRIVATE_KEY_HAS_OUTER_QUOTES"
        : "GOOGLE_CALENDAR_PRIVATE_KEY_HAS_OUTER_QUOTES"
    );
  }
  if (selectedPrivateKey.present && selectedPrivateKey.format !== "pkcs8_pem") {
    issues.push(
      selectedPrivateKeyVariable === "GOOGLE_CALENDAR_SERVICE_ACCOUNT_JSON"
        ? "GOOGLE_CALENDAR_SERVICE_ACCOUNT_JSON_PRIVATE_KEY_NOT_PKCS8_PEM"
        : "GOOGLE_CALENDAR_PRIVATE_KEY_NOT_PKCS8_PEM"
    );
  }
  if (membersCalendarId && !serviceCredentialPresent) {
    issues.push("GO_EVENTS_MEMBERS_CALENDAR_SERVER_CREDENTIAL_MISSING");
  }
  if (!apiKeyPresent && !serviceCredentialPresent) {
    issues.push("GOOGLE_CALENDAR_API_KEY_MISSING_FOR_PUBLIC_CALENDAR");
  }

  return {
    runtime: {
      nodeEnv: trimmed(env.NODE_ENV) || "unset",
      vercelEnv: trimmed(env.VERCEL_ENV) || "unset",
      vercelTargetEnv: trimmed(env.VERCEL_TARGET_ENV) || "unset",
      isVercel: env.VERCEL === "1",
    },
    variables: {
      GO_EVENTS_PUBLIC_CALENDAR_ID: {
        present: Boolean(publicCalendarId),
        usingBuiltInDefault: !publicCalendarId,
      },
      GO_EVENTS_MEMBERS_CALENDAR_ID: {
        present: Boolean(membersCalendarId),
      },
      GO_EVENTS_TIMEZONE: {
        present: Boolean(timezone),
        usingBuiltInDefault: !timezone,
      },
      GOOGLE_CALENDAR_API_KEY: {
        present: apiKeyPresent,
      },
      GOOGLE_CALENDAR_SERVICE_ACCOUNT_JSON: serviceAccountJson,
      GOOGLE_CALENDAR_CLIENT_EMAIL: {
        present: Boolean(clientEmail),
        looksLikeServiceAccount: SERVICE_ACCOUNT_EMAIL_PATTERN.test(clientEmail),
      },
      GOOGLE_CALENDAR_PRIVATE_KEY: splitPrivateKey,
    },
    selectedCredentialMode,
    credentialRequirement: {
      requiredForMembersCalendar: Boolean(membersCalendarId),
      acceptedAlternatives: [
        ["GOOGLE_CALENDAR_SERVICE_ACCOUNT_JSON"],
        [
          "GOOGLE_CALENDAR_CLIENT_EMAIL",
          "GOOGLE_CALENDAR_PRIVATE_KEY",
        ],
      ],
      missingFromSplitCredential: [
        ...(!clientEmail ? ["GOOGLE_CALENDAR_CLIENT_EMAIL"] : []),
        ...(!splitPrivateKey.present
          ? ["GOOGLE_CALENDAR_PRIVATE_KEY"]
          : []),
      ],
    },
    credentialEvaluation: {
      serviceCredentialPresent,
      serviceCredentialFormatReady,
      blockingCredentialConfiguration,
    },
    readiness: {
      publicCalendar:
        !blockingCredentialConfiguration &&
        (apiKeyPresent || serviceCredentialFormatReady),
      membersCalendar:
        !membersCalendarId ||
        (!blockingCredentialConfiguration && serviceCredentialFormatReady),
    },
    issues,
  };
}

export function getSafeGoEventsError(error) {
  return {
    name: error instanceof Error ? error.name : "Error",
    message: error instanceof Error ? error.message : String(error),
    code: error?.code || "GO_EVENTS_UNKNOWN_ERROR",
    status: error?.status || null,
  };
}

export function logGoEventsDiagnostic(level, event, details = {}) {
  const serialized = JSON.stringify({ level, event, ...details });
  if (level === "error") {
    console.error(serialized);
    return;
  }
  if (level === "warning") {
    console.warn(serialized);
    return;
  }
  console.log(serialized);
}

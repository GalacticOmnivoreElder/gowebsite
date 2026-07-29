export const PASSWORD_RESET_GENERIC_MESSAGE =
  "If an account exists for this email, we sent password reset instructions.";

const MASKED_AUTH_CODES = new Set([
  "auth/user-not-found",
  "auth/invalid-email",
]);

const CONFIGURATION_AUTH_CODES = new Set([
  "auth/invalid-continue-uri",
  "auth/missing-continue-uri",
  "auth/operation-not-allowed",
  "auth/unauthorized-continue-uri",
]);

export function passwordResetContinueUrl(origin) {
  const base = new URL(origin);
  if (!["http:", "https:"].includes(base.protocol)) {
    throw new Error("Invalid password reset origin");
  }
  return new URL("/login?reset=1", base.origin).toString();
}

export function passwordResetErrorMessage(code) {
  if (code === "auth/too-many-requests") {
    return "Too many reset attempts were made. Please wait a few minutes and try again.";
  }
  if (code === "auth/network-request-failed") {
    return "The reset request could not reach the server. Check your connection and try again.";
  }
  if (CONFIGURATION_AUTH_CODES.has(code)) {
    return "Password reset is temporarily unavailable. Please contact support.";
  }
  return "Password reset email could not be sent. Please try again.";
}

export async function requestPasswordReset({
  authInstance,
  email,
  origin,
  send,
}) {
  try {
    await send(authInstance, email, {
      url: passwordResetContinueUrl(origin),
    });
    return { message: PASSWORD_RESET_GENERIC_MESSAGE };
  } catch (error) {
    const code = error?.code || "unknown";
    console.error(
      JSON.stringify({
        level: "error",
        message: "password_reset_request_failed",
        errorCode: code,
      })
    );

    if (MASKED_AUTH_CODES.has(code)) {
      return { message: PASSWORD_RESET_GENERIC_MESSAGE };
    }

    const safeError = new Error(passwordResetErrorMessage(code));
    safeError.code = code;
    throw safeError;
  }
}

const USERNAME_PATTERN = /^[\p{L}\p{N}_ -]+$/u;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u;
const MODERN_DISCORD_USERNAME_PATTERN = /^[a-z0-9_.]{2,32}$/;
const LEGACY_DISCORD_USERNAME_PATTERN = /^[^\s#]{2,32}#\d{4}$/u;
export const MAX_PROFILE_BIO_LENGTH = 10000;

export function isValidEmail(value) {
  return EMAIL_PATTERN.test(String(value).trim());
}

export function isValidDiscordUsername(value) {
  const username = String(value).trim();
  const modernUsername = username.startsWith("@")
    ? username.slice(1)
    : username;

  return (
    (MODERN_DISCORD_USERNAME_PATTERN.test(modernUsername) &&
      !modernUsername.includes("..")) ||
    LEGACY_DISCORD_USERNAME_PATTERN.test(username)
  );
}

export function isValidProfileUrl(value) {
  try {
    const url = new URL(String(value).trim());
    return (
      (url.protocol === "http:" || url.protocol === "https:") &&
      Boolean(url.hostname)
    );
  } catch {
    return false;
  }
}

export function validateProfileData(data) {
  const errors = {};

  if (data.username !== undefined) {
    const username = String(data.username).trim();
    if (!username) {
      errors.username = "Username is required";
    } else if (username.length < 3) {
      errors.username = "Username must be at least 3 characters";
    } else if (username.length > 30) {
      errors.username = "Username must be 30 characters or less";
    } else if (!USERNAME_PATTERN.test(username)) {
      errors.username =
        "Username can only contain letters, numbers, spaces, underscores, and hyphens";
    }
  }

  if (
    data.bio !== undefined &&
    String(data.bio).length > MAX_PROFILE_BIO_LENGTH
  ) {
    errors.bio = `Bio must be ${MAX_PROFILE_BIO_LENGTH.toLocaleString()} characters or less`;
  }

  if (data.skills !== undefined) {
    if (!Array.isArray(data.skills)) {
      errors.skills = "Skills must be an array";
    } else if (data.skills.length > 20) {
      errors.skills = "You can select at most 20 skills";
    } else if (
      data.skills.some(
        (skill) =>
          typeof skill !== "string" ||
          !skill.trim() ||
          skill.trim().replace(/\s+/g, " ").length > 40
      )
    ) {
      errors.skills = "Each skill must be between 1 and 40 characters";
    }
  }

  if (data.socialLinks && typeof data.socialLinks === "object") {
    for (const [platform, rawValue] of Object.entries(data.socialLinks)) {
      const value = String(rawValue || "").trim();
      if (!value) continue;

      if (platform === "email" && !isValidEmail(value)) {
        errors["socialLinks.email"] =
          "Work email must be a valid email address";
      } else if (
        platform === "discord" &&
        !isValidDiscordUsername(value)
      ) {
        errors["socialLinks.discord"] =
          "Discord must be a valid username, such as username or username#1234";
      } else if (
        platform !== "email" &&
        platform !== "discord" &&
        !isValidProfileUrl(value)
      ) {
        errors[`socialLinks.${platform}`] = `${platform} must be a valid URL`;
      }
    }
  }

  if (
    data.profilePrivacy !== undefined &&
    !["public", "private"].includes(data.profilePrivacy)
  ) {
    errors.profilePrivacy = "Profile privacy must be public or private";
  }

  return errors;
}

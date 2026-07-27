const USERNAME_PATTERN = /^[\p{L}\p{N}_ -]+$/u;
const URL_PATTERN = /^https?:\/\/.+/i;
export const MAX_PROFILE_BIO_LENGTH = 10000;

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
    for (const [platform, url] of Object.entries(data.socialLinks)) {
      if (url && !URL_PATTERN.test(String(url).trim())) {
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

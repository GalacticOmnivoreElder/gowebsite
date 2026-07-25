const USERNAME_PATTERN = /^[\p{L}\p{N}_ -]+$/u;
const URL_PATTERN = /^https?:\/\/.+/i;

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

  if (data.bio !== undefined && String(data.bio).length > 500) {
    errors.bio = "Bio must be 500 characters or less";
  }

  if (data.avatar !== undefined && data.avatar) {
    const avatar = String(data.avatar);
    if (avatar.length > 250000) {
      errors.avatar = "Profile image is too large";
    } else if (
      !/^https?:\/\/.+/i.test(avatar) &&
      !/^data:image\/(?:svg\+xml|png|jpeg|gif|webp)[;,]/i.test(avatar)
    ) {
      errors.avatar = "Profile image must be a valid image URL";
    }
  }

  if (data.skills !== undefined) {
    if (!Array.isArray(data.skills)) {
      errors.skills = "Skills must be an array";
    } else if (data.skills.length > 20) {
      errors.skills = "You can select at most 20 skills";
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

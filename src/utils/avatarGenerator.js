import { createAvatar } from "@dicebear/core";
import { identicon } from "@dicebear/collection";

/**
 * Generate a unique avatar based on a seed (usually username or email)
 * Returns a data URL that can be used directly as an image src
 */
export function generateAvatar(seed, options = {}) {
  const avatar = createAvatar(identicon, {
    seed: seed,
    backgroundColor: [
      "b6e3f4",
      "c084fc",
      "f0abfc",
      "fb7185",
      "fbbf24",
      "60a5fa",
      "34d399",
      "a78bfa",
    ],
    ...options,
  });

  return avatar.toDataUri();
}

/**
 * Generate avatar based on username for email/password signups
 */
export function generateUserAvatar(username) {
  return generateAvatar(username, {
    // Add some variety to the avatars
    size: 200,
  });
}

/**
 * Generate avatar based on email as fallback
 */
export function generateEmailAvatar(email) {
  return generateAvatar(email, {
    size: 200,
  });
}

export function getAuthProvider(authUser) {
  if (authUser?.isAnonymous) return "anonymous";

  return (
    authUser?.providerData?.find((provider) => provider?.providerId)?.providerId ||
    "password"
  );
}

export function normalizeUsername(username, fallback = "") {
  const normalized = typeof username === "string" ? username.trim() : "";
  if (normalized) return normalized;

  return typeof fallback === "string" ? fallback.trim() : "";
}

export function normalizeAuthUser(
  authUser,
  profileData = null,
  now = new Date()
) {
  if (!authUser?.uid) return null;

  const provider = getAuthProvider(authUser);
  const fallbackUsername =
    normalizeUsername(authUser.displayName) ||
    authUser.email?.split("@")[0] ||
    (provider === "anonymous" ? "Guest" : "New User");
  const storedUsername = normalizeUsername(profileData?.username);

  const fallbackProfile = {
    joined: now,
    createdAt: now,
    uid: authUser.uid,
    provider,
    username: fallbackUsername,
    email: authUser.email || "",
    ...(authUser.photoURL ? { avatar: authUser.photoURL } : {}),
  };

  return {
    ...fallbackProfile,
    ...(profileData || {}),
    uid: authUser.uid,
    provider,
    username: storedUsername || fallbackUsername,
    email: authUser.email || profileData?.email || "",
  };
}

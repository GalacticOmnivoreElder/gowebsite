export async function requestWelcomeEmail(user, username, fetchImpl = fetch) {
  if (!user?.email || user.isAnonymous) {
    return { skipped: true };
  }

  const token = await user.getIdToken();
  const response = await fetchImpl("/api/welcomeEmail", {
    method: "POST",
    keepalive: true,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ username }),
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || "Failed to send welcome email");
  }

  return data;
}

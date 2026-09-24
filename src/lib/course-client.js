import { auth } from "@/firebase";
export async function courseFetch(path, options = {}) {
  const token = await auth.currentUser?.getIdToken();
  const response = await fetch(path, { ...options, headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(options.body ? { "Content-Type": "application/json" } : {}), ...options.headers }, cache: "no-store" });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || "The request could not be completed. Please try again.");
  return result;
}

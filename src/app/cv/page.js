import { redirect } from "next/navigation";

export default async function CvCompatibilityRedirect({ searchParams }) {
  const forwardedParams = await searchParams;
  const nextParams = new URLSearchParams();

  for (const [key, value] of Object.entries(forwardedParams || {})) {
    for (const item of Array.isArray(value) ? value : [value]) {
      if (typeof item === "string") nextParams.append(key, item);
    }
  }

  const query = nextParams.toString();
  redirect(`/profile/cv${query ? `?${query}` : ""}`);
}

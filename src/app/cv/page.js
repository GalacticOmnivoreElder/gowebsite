import { redirect } from "next/navigation";

export default async function LegacyCvPage({ searchParams }) {
  const legacyParams = await searchParams;
  const nextParams = new URLSearchParams();

  for (const [key, value] of Object.entries(legacyParams || {})) {
    for (const item of Array.isArray(value) ? value : [value]) {
      if (typeof item === "string") nextParams.append(key, item);
    }
  }

  const query = nextParams.toString();
  redirect(`/profile/cv${query ? `?${query}` : ""}`);
}

export const dynamic = "force-dynamic";

import { getProductConfig } from "@/lib/product-config";
import { listPublicMentors } from "@/lib/mentor-directory";

export async function GET(request) {
  if (!getProductConfig().featureFlags.mentorDirectory) {
    return Response.json({ error: "The mentor directory is not available yet" }, { status: 503 });
  }
  const search = new URL(request.url).searchParams;
  const mentors = await listPublicMentors({
    filters: {
      discipline: search.get("discipline") || "",
      skill: search.get("skill") || "",
      level: search.get("level") || "",
      language: search.get("language") || "",
      format: search.get("format") || "",
      availability: search.get("availability") || "",
      accepting: search.get("accepting") || "",
    },
  });
  return Response.json(mentors, { headers: { "Cache-Control": "public, max-age=60, s-maxage=300" } });
}

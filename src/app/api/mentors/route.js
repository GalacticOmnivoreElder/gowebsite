export const dynamic = "force-dynamic";

import { getMentorshipPilotConfig, getProductConfig } from "@/lib/product-config";
import { listPublicMentors } from "@/lib/mentor-directory";

export async function GET(request) {
  const product = getProductConfig();
  if (!product.featureFlags.mentorDirectory) {
    return Response.json({ error: "The mentor directory is not available yet" }, { status: 503 });
  }
  const pilot = getMentorshipPilotConfig();
  if (!pilot.featureFlags.mentorshipSystem || !pilot.featureFlags.publicMentorBrowsing) {
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

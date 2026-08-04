export const dynamic = "force-dynamic";

import { getProductConfig } from "@/lib/product-config";
import { getPublicMentor } from "@/lib/mentor-directory";
import { listPublicMentorReferences } from "@/lib/mentorship-feedback-service";

export async function GET(_request, { params }) {
  const product = getProductConfig();
  if (!product.featureFlags.mentorDirectory) {
    return Response.json({ error: "The mentor directory is not available yet" }, { status: 503 });
  }
  const { mentorId } = await params;
  const mentor = await getPublicMentor(mentorId);
  if (!mentor) return Response.json({ error: "Mentor profile not found" }, { status: 404 });
  const referencesEnabled = product.featureFlags.mentorFeedback && product.featureFlags.publicMentorStrengths;
  const mentorReferences = referencesEnabled
    ? await listPublicMentorReferences(mentorId)
    : [];
  return Response.json({ ...mentor, mentorReferences }, { headers: { "Cache-Control": referencesEnabled ? "no-store" : "public, max-age=60, s-maxage=300" } });
}

import { ParticipantManager } from "@/components/learning/ParticipantManager";

export default async function LearningParticipantsPage({ params }) {
  const { slug } = await params;
  return <ParticipantManager slug={slug} />;
}

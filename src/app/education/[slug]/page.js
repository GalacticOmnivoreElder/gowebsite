import { LearningDetail } from "@/components/learning/LearningDetail";

export default async function LearningItemPage({ params }) {
  const { slug } = await params;
  return <LearningDetail slug={slug} />;
}

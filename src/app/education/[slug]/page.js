import { LearningDetail } from "@/components/learning/LearningDetail";
import { CourseBootcamp } from "@/components/learning/CourseBootcamp";
import { BOOTCAMP_ID } from "@/content/idea-to-playable";
import { createMetadata } from "@/lib/seo";

export async function generateMetadata({ params }) {
  const { slug } = await params;
  if (slug === BOOTCAMP_ID || slug.startsWith(`${BOOTCAMP_ID}-`)) return createMetadata({ title: "From Idea to Playable — AI-Assisted Game Development Bootcamp", description: "Bring a game idea on Monday. Publish a playable v0.1 prototype by Friday. Five live days with Galactic Omnivore.", path: `/education/${BOOTCAMP_ID}` });
  return {};
}

export default async function LearningItemPage({ params }) {
  const { slug } = await params;
  if (slug === BOOTCAMP_ID || slug.startsWith(`${BOOTCAMP_ID}-`)) return <CourseBootcamp selectedSlug={slug} />;
  return <LearningDetail slug={slug} />;
}

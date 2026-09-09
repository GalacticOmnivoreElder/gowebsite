import { MentorDetail } from "@/components/mentors/MentorDetail";

export const dynamic = "force-dynamic";

export default async function MentorPage({ params }) {
  const { mentorId } = await params;
  return <MentorDetail mentorId={mentorId} />;
}

import { permanentRedirect } from "next/navigation";

export default async function MentorRedirectPage({ params }) {
  const { mentorId } = await params;
  permanentRedirect(`/mentorship/${encodeURIComponent(mentorId)}`);
}

import EventsPage from "@/components/events/EventsPage";
import { createMetadata } from "@/lib/seo";

export const metadata = createMetadata({
  title: "GO Events",
  description:
    "Discover workshops, community sessions, mentorship events, project meetups, and practical game-development activities from Galactic Omnivore.",
  path: "/events",
});

export default function EventsRoute() {
  return <EventsPage />;
}

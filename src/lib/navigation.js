// Canonical route contract: { href: "/mentorship", label: "Mentorship" }.
const mentorshipNavigationItem = Object.freeze({
  href: "/mentorship",
  label: "Mentorship",
  path: "/mentorship",
  description: "Find a reviewed mentor for your next practical milestone.",
});

export const learningNavigation = Object.freeze([
  {
    label: "Ask the Omnivore",
    href: "/learn",
    path: "/learn",
    description: "Find your next learning step with the Galactic Omnivore.",
  },
  mentorshipNavigationItem,
  {
    label: "Courses",
    href: "/education?format=course",
    path: "/education",
    description: "Structured learning for practical game-development skills.",
  },
  {
    label: "Workshops",
    href: "/education?format=workshop",
    path: "/education",
    description: "Focused sessions for applying skills in context.",
  },
  {
    label: "Video Bundles",
    href: "/video-bundles",
    path: "/video-bundles",
    description: "Curated video collections with practical supporting material.",
  },
  {
    label: "Resources",
    href: "/resources",
    path: "/resources",
    description: "Practical learning material and community resources.",
  },
]);

export const primaryNavigation = Object.freeze([
  { href: "/community", label: "Community" },
  { href: "/membership", label: "Membership" },
  { href: "/projects", label: "Project" },
  { href: "/services", label: "Services" },
]);

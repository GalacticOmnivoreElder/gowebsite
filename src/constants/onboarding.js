// GO 2.0 Onboarding + CV constants (from GO_2_0_Core_MVP_Layers_Technical_Specs).

export const ONBOARDING_STEPS = [
  "identity",
  "discord",
  "role-skills",
  "portfolio",
  "goals",
  "help",
  "consent",
];

export const TOTAL_ONBOARDING_STEPS = ONBOARDING_STEPS.length;

export const PRIMARY_ROLES = [
  "Game Designer",
  "Programmer",
  "2D Artist",
  "3D Artist",
  "Animator",
  "Writer / Narrative Designer",
  "Sound Designer / Composer",
  "Producer / Project Manager",
  "QA Tester",
  "Marketing / Community",
];

export const SKILL_LEVELS = [
  {
    id: "beginner",
    label: "Learning",
    description: "Learning the fundamentals and building first projects.",
  },
  {
    id: "junior",
    label: "Developing",
    description: "Can contribute to a project with guidance.",
  },
  {
    id: "intermediate",
    label: "Independent",
    description: "Can complete typical work independently.",
  },
  {
    id: "advanced",
    label: "Advanced",
    description: "Handles complex work and can guide others.",
  },
  {
    id: "professional",
    label: "Production-proven",
    description: "Has substantial professional production experience.",
  },
];

export const COMMON_TOOLS = [
  "Unity",
  "Unreal",
  "Godot",
  "Blender",
  "Maya",
  "Krita",
  "Photoshop",
  "Aseprite",
  "Substance",
  "FMOD",
  "Wwise",
  "C#",
  "C++",
  "GDScript",
  "Python",
  "Trello",
  "Notion",
  "Miro",
  "Git",
];

export const PORTFOLIO_LINK_TYPES = [
  "portfolio",
  "github",
  "itch",
  "steam",
  "artstation",
  "behance",
  "linkedin",
  "other",
];

export const HELP_TOPICS = [
  "Programming",
  "Art",
  "Design",
  "Audio",
  "Writing",
  "Production",
  "Marketing",
  "Finding a team",
  "Publishing",
  "Portfolio review",
];

export const PAST_PROJECT_STATUSES = ["prototype", "released", "jam", "portfolio"];

export const DISCORD_INVITE_URL = "https://discord.gg/ZbSShxu6K4";

// GO CV section types the builder/editor understands.
export const CV_SECTION_TYPES = [
  "summary",
  "skills",
  "tools",
  "projects",
  "portfolio",
  "quest",
  "availability",
  "experience",
  "education",
  "interests",
  "contact",
];

export const CV_STATUSES = ["draft", "active", "archived"];

// Default visibility per spec: admins yes, creators yes, public no, matching opt-in.
export const DEFAULT_PROFILE_VISIBILITY = {
  visibility_public: false,
  visibility_project_creators: true,
  visibility_job_matching: true,
  visibility_admins: true,
};

export function isValidOnboardingStep(step) {
  return ONBOARDING_STEPS.includes(step);
}

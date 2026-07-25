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
  "Systems Designer",
  "Level Designer",
  "UX / UI Designer",
  "Programmer",
  "Gameplay Programmer",
  "Engine Programmer",
  "Tools Programmer",
  "2D Artist",
  "Concept Artist",
  "UI Artist",
  "3D Artist",
  "Character Artist",
  "Environment Artist",
  "Technical Artist",
  "Animator",
  "Writer / Narrative Designer",
  "Sound Designer",
  "Composer",
  "Producer",
  "Project Manager",
  "QA Tester",
  "Marketing",
  "Community Manager",
  "Business Development",
  "Other",
];

export const SKILL_LEVEL_OPTIONS = [
  {
    value: "beginner",
    label: "Learning",
    description: "Building fundamentals through study and personal projects.",
  },
  {
    value: "junior",
    label: "Junior",
    description: "Ready to contribute with guidance and feedback.",
  },
  {
    value: "intermediate",
    label: "Intermediate",
    description: "Can complete production work independently.",
  },
  {
    value: "advanced",
    label: "Senior",
    description: "Leads complex work and supports other team members.",
  },
  {
    value: "professional",
    label: "Expert",
    description: "Deep specialist experience across shipped work.",
  },
];

export const SKILL_LEVELS = SKILL_LEVEL_OPTIONS.map((option) => option.value);

export const COMMON_TOOLS = [
  "Unity",
  "Unreal Engine",
  "Godot",
  "GameMaker Studio",
  "Construct 3",
  "Blender",
  "Maya",
  "3ds Max",
  "ZBrush",
  "Krita",
  "Photoshop",
  "Aseprite",
  "Substance Painter",
  "Figma",
  "FMOD",
  "Wwise",
  "Ableton Live",
  "FL Studio",
  "C#",
  "C++",
  "JavaScript",
  "TypeScript",
  "GDScript",
  "Python",
  "Lua",
  "GitHub",
  "GitLab",
  "Perforce",
  "Jira",
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

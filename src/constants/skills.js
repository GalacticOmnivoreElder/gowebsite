export const SKILL_CATEGORIES = [
  "Game Development",
  "Programming",
  "Art & Design",
  "Audio",
  "Production",
  "Web & Tools",
  "Other",
];

export const LANDING_FALLBACK_SKILLS = [
  "2D Art",
  "3D Modeling",
  "Programming",
  "Game Design",
  "Audio Design",
  "Scripting",
  "Level Design",
  "UI/UX",
  "Project Management",
  "Marketing",
  "Animation",
  "Visual Effects",
  "Narrative Design",
  "QA Testing",
];

const directoryGroups = {
  "Game Development": [
    "Unity",
    "Unreal Engine",
    "Godot",
    "GameMaker Studio",
    "Construct 3",
    "Game Design",
    "Level Design",
    "Narrative Design",
    "QA Testing",
  ],
  Programming: [
    "Programming",
    "Scripting",
    "C#",
    "C++",
    "JavaScript",
    "TypeScript",
    "Python",
    "Java",
    "Lua",
  ],
  "Art & Design": [
    "2D Art",
    "3D Modeling",
    "UI/UX",
    "Animation",
    "Visual Effects",
    "Photoshop",
    "Illustrator",
    "Blender",
    "Maya",
    "3ds Max",
    "ZBrush",
    "Substance Painter",
    "Aseprite",
    "Figma",
    "Sketch",
  ],
  Audio: [
    "Audio Design",
    "FMOD",
    "Wwise",
    "Audacity",
    "Pro Tools",
    "FL Studio",
    "Ableton Live",
  ],
  Production: ["Project Management", "Marketing", "Jira", "Trello", "Notion"],
  "Web & Tools": [
    "React",
    "Next.js",
    "Vue.js",
    "Angular",
    "Node.js",
    "HTML/CSS",
    "Git",
    "Perforce",
    "Slack",
    "Discord",
  ],
};

export const DEFAULT_SKILL_DIRECTORY = Object.entries(directoryGroups).flatMap(
  ([category, names]) => names.map((name) => ({ name, category }))
);

// Kept for existing profile and onboarding screens while they migrate to the
// server-managed directory.
export const GAMING_TECH_SKILLS = DEFAULT_SKILL_DIRECTORY.map(
  ({ name }) => name
);

export const SOCIAL_PLATFORMS = [
  {
    key: "discord",
    label: "Discord",
    placeholder: "@username or username#1234",
    helperText: "Enter your Discord username, not a URL.",
    inputType: "text",
  },
  {
    key: "email",
    label: "Work Email",
    placeholder: "work@example.com",
    helperText: "Enter a valid email address.",
    inputType: "email",
  },
  {
    key: "linkedin",
    label: "LinkedIn",
    placeholder: "linkedin.com/in/username",
  },
  { key: "twitter", label: "Twitter/X", placeholder: "@username" },
  { key: "github", label: "GitHub", placeholder: "github.com/username" },
  {
    key: "portfolio",
    label: "Portfolio Website",
    placeholder: "https://yoursite.com",
  },
  {
    key: "artstation",
    label: "ArtStation",
    placeholder: "artstation.com/username",
  },
  { key: "behance", label: "Behance", placeholder: "behance.net/username" },
  { key: "youtube", label: "YouTube", placeholder: "youtube.com/@username" },
  { key: "twitch", label: "Twitch", placeholder: "twitch.tv/username" },
];

// Builds a structured GameDev Passport from stored member profile facts.
// Generation is deterministic and never invents projects, tools, roles, or
// experience.

import {
  buildAvailabilityContent,
  normalizeAvailability,
  reconcileAvailabilityMissingInformation,
} from "@/lib/availability";

function arr(value) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

function joinList(list) {
  return arr(list).join(", ");
}

export function buildCvFromProfile(profile = {}) {
  const displayName = profile.display_name || profile.full_name || "GO Member";
  const primaryRole = profile.primary_role || "Game Developer";
  const skillLevel = profile.skill_level || "beginner";
  const tools = arr(profile.tools);
  const secondaryRoles = arr(profile.secondary_roles);
  const pastProjects = arr(profile.past_projects);
  const portfolioLinks = arr(
    profile.user_portfolio_links || profile.portfolio_links
  );
  const availability = normalizeAvailability({ profile });
  const lookingFor = [];
  if (availability.availableForProjects) lookingFor.push("projects");
  if (availability.availableForPaidWork) lookingFor.push("paid work");
  if (profile.looking_for_team) lookingFor.push("team members");
  if (profile.looking_for_mentorship) lookingFor.push("mentorship");
  if (profile.looking_for_jobs) lookingFor.push("jobs/internships");

  const summary = buildBaselineSummary({
    primaryRole,
    skillLevel,
    tools,
    aboutMe: profile.about_me || profile.bio,
    currentGoal: profile.current_goal,
    lookingFor,
  });

  const sections = [
    {
      section_type: "summary",
      title: "Professional Summary",
      content_json: { text: summary },
    },
    {
      section_type: "skills",
      title: "Skills",
      content_json: {
        primary_role: primaryRole,
        secondary_roles: secondaryRoles,
        skill_level: skillLevel,
      },
    },
    {
      section_type: "tools",
      title: "Tools & Engines",
      content_json: { tools },
    },
    {
      section_type: "projects",
      title: "Projects",
      content_json: {
        projects: pastProjects.map((project) => ({
          title: project.title || "",
          role: project.role || "",
          description: project.description || "",
          tools: arr(project.tools),
          link: project.link || "",
          status: project.status || "",
        })),
      },
    },
    {
      section_type: "portfolio",
      title: "Portfolio",
      content_json: { links: portfolioLinks },
    },
    {
      section_type: "availability",
      title: "Availability",
      content_json: buildAvailabilityContent(profile),
    },
    {
      section_type: "interests",
      title: "Interests",
      content_json: {
        looking_for: lookingFor,
        can_help_with: arr(profile.can_help_with),
        needs_help_with: arr(profile.needs_help_with),
      },
    },
    {
      section_type: "contact",
      title: "Contact",
      content_json: {
        display_name: displayName,
        email_preference: profile.email || null,
        discord_username: profile.discord_username || null,
        location: profile.location || null,
        timezone: profile.timezone || null,
      },
    },
  ];

  return {
    title: `${displayName} — ${primaryRole}`,
    summary,
    sections,
    suggested_improvements: buildSuggestions({
      availability,
      portfolioLinks,
      pastProjects,
      lookingFor,
    }),
    missing_information: buildMissing({ availability, portfolioLinks }),
  };
}

function buildBaselineSummary({
  primaryRole,
  skillLevel,
  tools,
  aboutMe,
  currentGoal,
  lookingFor,
}) {
  if (aboutMe && String(aboutMe).trim()) {
    return String(aboutMe).trim();
  }

  let summary = `${capitalize(skillLevel)} ${primaryRole.toLowerCase()}`;
  if (tools.length) {
    summary += ` working with ${joinList(tools.slice(0, 4))}`;
  }
  summary += ".";
  if (currentGoal) {
    summary += ` Currently ${currentGoal.trim().replace(/\.$/, "")}.`;
  }
  if (lookingFor.length) {
    summary += ` Looking for ${joinList(lookingFor)}.`;
  }
  return summary;
}

function buildSuggestions({
  availability,
  portfolioLinks,
  pastProjects,
  lookingFor,
}) {
  const suggestions = [];
  if (!portfolioLinks.length) suggestions.push("Add at least one portfolio link");
  if (!pastProjects.length) {
    suggestions.push("Describe one past prototype or game jam project");
  }
  if (!lookingFor.length && availability?.status !== "unavailable") {
    suggestions.push("Define what type of project you want to join");
  }
  return suggestions;
}

function buildMissing({ availability, portfolioLinks }) {
  const missing = [];
  if (!portfolioLinks.length) missing.push("portfolio link");
  return reconcileAvailabilityMissingInformation(missing, availability);
}

function capitalize(value) {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

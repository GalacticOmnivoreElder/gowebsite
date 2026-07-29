// Builds a structured GO CV from a member's onboarding profile.
//
// Design per spec: the CV is a STRUCTURED profile first (export later), and AI
// may only improve WORDING — it must never invent projects, tools, or
// experience. When ANTHROPIC_API_KEY is absent the generator is fully
// deterministic, so onboarding still produces a usable CV without any AI.

import {
  buildAvailabilityContent,
  normalizeAvailability,
  reconcileAvailabilityMissingInformation,
} from "@/lib/availability";

function arr(v) {
  return Array.isArray(v) ? v.filter(Boolean) : [];
}

function joinList(list) {
  return arr(list).join(", ");
}

/**
 * Deterministic mapping of profile data → CV sections + a plain summary.
 * Returns { title, summary, sections: [{ section_type, title, content_json }] }.
 */
export function buildCvFromProfile(profile = {}) {
  const displayName = profile.display_name || profile.full_name || "GO Member";
  const primaryRole = profile.primary_role || "Game Developer";
  const skillLevel = profile.skill_level || "beginner";
  const tools = arr(profile.tools);
  const secondaryRoles = arr(profile.secondary_roles);
  const pastProjects = arr(profile.past_projects);
  const portfolioLinks = arr(profile.user_portfolio_links || profile.portfolio_links);
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
        projects: pastProjects.map((p) => ({
          title: p.title || "",
          role: p.role || "",
          description: p.description || "",
          tools: arr(p.tools),
          link: p.link || "",
          status: p.status || "",
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

  const parts = [];
  parts.push(`${capitalize(skillLevel)} ${primaryRole.toLowerCase()}`);
  if (tools.length) {
    parts[0] += ` working with ${joinList(tools.slice(0, 4))}`;
  }
  let summary = parts[0] + ".";
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
  const s = [];
  if (!portfolioLinks.length) s.push("Add at least one portfolio link");
  if (!pastProjects.length)
    s.push("Describe one past prototype or game jam project");
  if (!lookingFor.length && availability?.status !== "unavailable") {
    s.push("Define what type of project you want to join");
  }
  return s;
}

function buildMissing({ availability, portfolioLinks }) {
  const m = [];
  if (!portfolioLinks.length) m.push("portfolio link");
  return reconcileAvailabilityMissingInformation(m, availability);
}

function capitalize(s) {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Optionally rewrite ONLY the summary wording with Claude. Never invents facts:
 * the model is given the deterministic summary + raw data and asked to polish.
 * Falls back to the baseline summary on any error or missing API key.
 */
export async function improveSummaryWithAI(profile, baselineSummary) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return baselineSummary;

  const input = {
    about_me: profile.about_me || profile.bio || null,
    primary_role: profile.primary_role,
    skill_level: profile.skill_level,
    tools: arr(profile.tools),
    current_goal: profile.current_goal,
    past_projects: arr(profile.past_projects).map((p) => p.title).filter(Boolean),
  };

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 300,
        system:
          "You write concise professional summaries for game-developer CVs. " +
          "Rephrase ONLY using the facts provided. Never invent projects, tools, " +
          "roles, or experience. Output 2-3 sentences of plain text, no preamble.",
        messages: [
          {
            role: "user",
            content:
              "Improve the wording of this CV summary using only these facts.\n\n" +
              `Facts: ${JSON.stringify(input)}\n\n` +
              `Current summary: ${baselineSummary}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      console.error("Claude CV summary failed:", await response.text());
      return baselineSummary;
    }

    const data = await response.json();
    const text = data?.content?.[0]?.text?.trim();
    return text || baselineSummary;
  } catch (error) {
    console.error("Claude CV summary error:", error);
    return baselineSummary;
  }
}

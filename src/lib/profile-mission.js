import {
  normalizeAvailability,
  reconcileAvailabilityMissingInformation,
} from "@/lib/availability";

const SOCIAL_LABELS = {
  artstation: "ArtStation",
  behance: "Behance",
  discord: "Discord",
  email: "Email",
  github: "GitHub",
  linkedin: "LinkedIn",
  portfolio: "Portfolio",
  twitch: "Twitch",
  twitter: "Twitter / X",
  youtube: "YouTube",
};

function compact(values) {
  return (Array.isArray(values) ? values : []).filter(Boolean);
}

function unique(values) {
  return [...new Set(compact(values).map((value) => String(value).trim()).filter(Boolean))];
}

function valueFromLink(link) {
  if (typeof link === "string") return link.trim();
  return String(link?.value || link?.url || "").trim();
}

function safeHttpUrl(value) {
  const rawValue = String(value || "").trim();
  if (!rawValue) return null;

  const candidate = /^https?:\/\//i.test(rawValue)
    ? rawValue
    : `https://${rawValue}`;

  try {
    const url = new URL(candidate);
    return ["http:", "https:"].includes(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
}

export function getCvSection(cv, sectionType) {
  return (
    cv?.sections?.find((section) => section.section_type === sectionType)
      ?.content_json || {}
  );
}

export function getSocialHref(platform, value) {
  const cleanValue = String(value || "").trim();
  if (!cleanValue) return null;

  if (platform === "email") return `mailto:${cleanValue}`;
  if (platform === "discord") return null;

  if (/^https?:\/\//i.test(cleanValue)) return safeHttpUrl(cleanValue);

  const username = cleanValue.replace(/^@/, "");
  const platformUrls = {
    artstation: `https://www.artstation.com/${username}`,
    behance: `https://www.behance.net/${username}`,
    github: `https://github.com/${username}`,
    linkedin: `https://www.linkedin.com/in/${username}`,
    twitch: `https://www.twitch.tv/${username}`,
    twitter: `https://x.com/${username}`,
    youtube: `https://www.youtube.com/@${username}`,
  };

  return safeHttpUrl(platformUrls[platform] || cleanValue);
}

export function getVisibleSocialLinks(profile = {}, isOwner = false) {
  const links = profile.socialLinks || {};
  const visibility = profile.socialVisibility || {};

  return Object.entries(links)
    .filter(([platform, link]) => {
      if (!valueFromLink(link)) return false;
      // Public API responses are already redacted and intentionally omit the
      // visibility map. Owner responses contain every link, so re-apply the
      // visibility controls before rendering or exporting.
      return !isOwner || visibility[platform] === true;
    })
    .map(([platform, link]) => {
      const value = valueFromLink(link);
      return {
        platform,
        label: link?.label || SOCIAL_LABELS[platform] || platform,
        value,
        href: getSocialHref(platform, value),
      };
    });
}

export function flattenProjects(projects = {}) {
  const groups = [
    ["Owner", projects?.ownerProjects],
    ["Admin", projects?.adminProjects],
    ["Team Member", projects?.teamMemberProjects],
  ];
  const seen = new Set();

  return groups.flatMap(([role, items]) =>
    compact(items)
      .filter((project) => {
        const key = project?.id || `${project?.title || ""}-${role}`;
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .map((project) => ({ ...project, role }))
  );
}

function titleWithoutName(title, name) {
  const cleanTitle = String(title || "").trim();
  if (!cleanTitle) return "";

  const escapedName = String(name || "")
    .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    .trim();
  if (!escapedName) return cleanTitle;

  return cleanTitle
    .replace(new RegExp(`^${escapedName}\\s*[—–-]\\s*`, "i"), "")
    .trim();
}

function formatJoinedAt(value) {
  if (!value) return null;
  const seconds = value?.seconds ?? value?._seconds;
  const date = seconds ? new Date(seconds * 1000) : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("en", {
    month: "short",
    year: "numeric",
  }).format(date);
}

export function buildMissionProfile({
  profile = {},
  currentUser = {},
  projects = {},
  isOwner = false,
} = {}) {
  const cv = profile.cv || null;
  const contact = getCvSection(cv, "contact");
  const skillsSection = getCvSection(cv, "skills");
  const toolsSection = getCvSection(cv, "tools");
  const projectsSection = getCvSection(cv, "projects");
  const experienceSection = getCvSection(cv, "experience");
  const educationSection = getCvSection(cv, "education");
  const portfolioSection = getCvSection(cv, "portfolio");
  const availabilitySection = getCvSection(cv, "availability");
  const interestsSection = getCvSection(cv, "interests");
  const summarySection = getCvSection(cv, "summary");

  const name =
    profile.username ||
    contact.display_name ||
    currentUser.username ||
    "GO Member";
  const headline =
    skillsSection.primary_role ||
    cv?.primary_role ||
    titleWithoutName(cv?.title, name) ||
    "Game development professional";
  const summary =
    cv?.summary ||
    summarySection.text ||
    profile.bio ||
    "This member is still preparing their professional mission overview.";
  const platformProjects = flattenProjects(projects);
  const cvProjects = compact(
    experienceSection.entries ||
      experienceSection.experience ||
      projectsSection.projects
  );
  const skills = unique([
    ...compact(profile.skills),
    skillsSection.primary_role,
    ...compact(skillsSection.secondary_roles),
  ]);
  const tools = unique(toolsSection.tools);
  const availabilityState = normalizeAvailability({
    availability: availabilitySection,
    profile,
  });
  const availability = availabilityState.labels;
  const socialLinks = getVisibleSocialLinks(profile, isOwner);
  const socialVisibility = profile.socialVisibility || {};
  const canUseCvEmail =
    Boolean(contact.email_preference) &&
    (!isOwner || socialVisibility.email === true);
  const canUseCvDiscord =
    Boolean(contact.discord_username) &&
    (!isOwner || socialVisibility.discord === true);
  if (
    canUseCvEmail &&
    !socialLinks.some((link) => link.platform === "email")
  ) {
    socialLinks.push({
      platform: "email",
      label: SOCIAL_LABELS.email,
      value: contact.email_preference,
      href: getSocialHref("email", contact.email_preference),
    });
  }
  if (
    canUseCvDiscord &&
    !socialLinks.some((link) => link.platform === "discord")
  ) {
    socialLinks.push({
      platform: "discord",
      label: SOCIAL_LABELS.discord,
      value: contact.discord_username,
      href: null,
    });
  }
  const portfolioLinks = compact(portfolioSection.links)
    .map(valueFromLink)
    .filter(Boolean)
    .map((value) => ({ value, href: safeHttpUrl(value) }))
    .filter((link) => link.href);
  const missingInformation = reconcileAvailabilityMissingInformation(
    unique(cv?.missing_information),
    availabilityState
  );

  const completionChecks = [
    Boolean(name && name !== "GO Member"),
    Boolean(headline),
    Boolean(cv?.summary || summarySection.text || profile.bio),
    Boolean(profile.aboutMe),
    skills.length > 0,
    tools.length > 0,
    cvProjects.length > 0 || platformProjects.length > 0,
    portfolioLinks.length > 0 || socialLinks.length > 0,
    availabilityState.hasExplicitSelection,
  ];
  const completion = Math.round(
    (completionChecks.filter(Boolean).length / completionChecks.length) * 100
  );

  return {
    availability,
    availabilityStatus: availabilityState.status,
    avatar: profile.avatar || currentUser.avatar || null,
    canHelpWith: unique(interestsSection.can_help_with),
    contact: {
      discord: contact.discord_username || null,
      email: contact.email_preference || null,
      location: contact.location || null,
      timezone: contact.timezone || null,
    },
    completion,
    cv,
    cvProjects,
    cvStatus: cv?.status || "not-generated",
    education: compact(
      educationSection.entries || educationSection.education
    ),
    headline,
    hasExplicitAvailability: availabilityState.hasExplicitSelection,
    intro: profile.bio || "",
    joinedAt: formatJoinedAt(
      profile.memberSince ||
        profile.joinedAt ||
        profile.createdAt ||
        currentUser.createdAt
    ),
    longBio: profile.aboutMe || "",
    lookingFor: unique(interestsSection.looking_for),
    missingInformation,
    name,
    needsHelpWith: unique(interestsSection.needs_help_with),
    platformProjects,
    portfolioLinks,
    skillLevel: skillsSection.skill_level || cv?.skill_level || null,
    skills,
    socialLinks,
    summary,
    tools,
  };
}

export function sanitizeCvFilename(name) {
  const slug = String(name || "go-member")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  return `${slug || "go-member"}-gamedev-passport.pdf`;
}

function socialValue(model, platform) {
  return model.socialLinks.find((link) => link.platform === platform)?.value;
}

function projectForExport(project) {
  return {
    description: project?.description || project?.goal || "",
    link: project?.link || "",
    role: project?.role || "",
    status: project?.status || "",
    title: project?.title || "Untitled project",
    tools: unique(project?.tools),
  };
}

export function buildCvExportModel({
  profile = {},
  currentUser = {},
  projects = {},
} = {}) {
  const model = buildMissionProfile({
    profile,
    currentUser,
    projects,
    isOwner: true,
  });
  const cvProjectTitles = new Set(
    model.cvProjects.map((project) => String(project?.title || "").toLowerCase())
  );
  const additionalProjects = model.platformProjects.filter(
    (project) =>
      !cvProjectTitles.has(String(project?.title || "").toLowerCase())
  );

  return {
    availability: model.availability,
    contact: {
      discord: socialValue(model, "discord") || null,
      email: socialValue(model, "email") || null,
      location: model.contact.location,
      timezone: model.contact.timezone,
    },
    education: model.education,
    experience: [
      ...model.cvProjects.map(projectForExport),
      ...additionalProjects.map(projectForExport),
    ],
    filename: sanitizeCvFilename(model.name),
    headline: model.headline,
    interests: {
      canHelpWith: model.canHelpWith,
      lookingFor: model.lookingFor,
    },
    name: model.name,
    portfolioLinks: model.portfolioLinks,
    skills: model.skills,
    socialLinks: model.socialLinks.filter(
      (link) => !["discord", "email"].includes(link.platform)
    ),
    summary: model.summary,
    tools: model.tools,
  };
}

export function redactCvContact(cv, socialVisibility = {}) {
  if (!cv) return null;

  return {
    ...cv,
    sections: compact(cv.sections).map((section) => {
      if (section.section_type !== "contact") return section;
      const contact = { ...(section.content_json || {}) };
      if (socialVisibility.email !== true) delete contact.email_preference;
      if (socialVisibility.discord !== true) delete contact.discord_username;
      return { ...section, content_json: contact };
    }),
  };
}

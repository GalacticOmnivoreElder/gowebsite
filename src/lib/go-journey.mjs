import { getSkillKey, sanitizeSkills } from "@/lib/skills";

export const STARDATE_VERSION = "go-cosmic-v1";
export const STARDATE_SOURCE = "https://doi.org/10.1051/0004-6361/201833910";
export const STARDATE_REFERENCE_UTC = "2018-01-01T00:00:00.000Z";
export const UNIVERSE_AGE_GYR = 13.797;
export const UNIVERSE_AGE_UNCERTAINTY_GYR = 0.023;
const DAYS_PER_YEAR = 365.25;

function validDate(value) {
  const date = value?.toDate?.() || (value instanceof Date ? value : new Date(value));
  return Number.isFinite(date.getTime()) ? date : null;
}

function ordinalDate(date) {
  const start = Date.UTC(date.getUTCFullYear(), 0, 1);
  const day = Math.floor((Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) - start) / 86400000) + 1;
  return `${date.getUTCFullYear()}.${String(day).padStart(3, "0")}`;
}

/**
 * GO's original cosmic-age display. The cosmological age is rounded to 0.01 Gyr
 * and its uncertainty is rounded outward. The UTC ordinal suffix distinguishes
 * entries; callers must retain and sort by the canonical ISO timestamp.
 */
export function formatGoStardate(value) {
  const date = validDate(value);
  if (!date) return null;
  const referenceMs = Date.parse(STARDATE_REFERENCE_UTC);
  const elapsedCalendarYears = (date.getTime() - referenceMs) / (DAYS_PER_YEAR * 86400000);
  const cosmicAgeGyr = UNIVERSE_AGE_GYR + elapsedCalendarYears / 1_000_000_000;
  return {
    version: STARDATE_VERSION,
    label: `GO-SD ${cosmicAgeGyr.toFixed(2)} ± 0.03 Gyr · ${ordinalDate(date)}`,
    utc: date.toISOString(),
    source: STARDATE_SOURCE,
    uncertainty: "Planck 2018 base-ΛCDM estimate: 13.797 ± 0.023 billion years; display uncertainty rounded outward to 0.03 Gyr.",
    precision: "Cosmic age rounded to 0.01 Gyr; UTC ordinal suffix is a display key, not a cosmological measurement.",
  };
}

export function normalizeMatchmakingProfile(input = {}) {
  const skills = sanitizeSkills(input.skills, { max: 20 }).slice(0, 20);
  const seekingSkills = sanitizeSkills(input.seekingSkills, { max: 20 }).slice(0, 20);
  const interests = sanitizeSkills(input.interests, { max: 12 }).slice(0, 12);
  const timeZone = String(input.timeZone || "").trim().slice(0, 80);
  if (timeZone) {
    try {
      new Intl.DateTimeFormat("en", { timeZone }).format();
    } catch {
      throw Object.assign(new Error("Choose a valid time zone."), { status: 400 });
    }
  }
  const availability = ["available", "unavailable"].includes(input.availability) ? input.availability : "unspecified";
  const appetite = ["hungry", "one_more_bite", "full"].includes(input.sharedAppetite) ? input.sharedAppetite : null;
  return {
    optedIn: input.optedIn === true,
    shareAppetite: input.shareAppetite === true,
    skills,
    seekingSkills,
    interests,
    goal: ["game-jam", "prototype", "ongoing-project", "learning", "portfolio"].includes(input.goal) ? input.goal : "",
    timeZone,
    availability,
    sharedAppetite: input.shareAppetite === true ? appetite : null,
    updatedAt: input.updatedAt || null,
  };
}

function intersection(left = [], right = []) {
  const rightKeys = new Set(right.map(getSkillKey));
  return left.filter((value) => rightKeys.has(getSkillKey(value)));
}

export function scoreMatch(left = {}, right = {}) {
  if (!left.optedIn || !right.optedIn || left.availability === "unavailable" || right.availability === "unavailable") {
    return { score: 0, reasons: [], eligible: false };
  }
  let score = 10;
  const reasons = ["Both creators opted into GO matchmaking"];
  const complementary = [
    ...intersection(left.skills, right.seekingSkills),
    ...intersection(right.skills, left.seekingSkills),
  ];
  if (complementary.length) {
    score += Math.min(36, 18 + complementary.length * 6);
    reasons.push(`Complementary GO skill tags: ${[...new Set(complementary)].slice(0, 3).join(", ")}`);
  }
  const sharedInterests = intersection(left.interests, right.interests);
  if (sharedInterests.length) {
    score += Math.min(24, 12 + sharedInterests.length * 4);
    reasons.push(`Shared interests: ${sharedInterests.slice(0, 3).join(", ")}`);
  }
  if (left.timeZone && right.timeZone && left.timeZone === right.timeZone) {
    score += 12;
    reasons.push("Same time zone");
  }
  if (left.availability === "available" && right.availability === "available") {
    score += 16;
    reasons.push("Both marked available for projects");
  }
  if (["hungry", "one_more_bite"].includes(left.sharedAppetite) && ["hungry", "one_more_bite"].includes(right.sharedAppetite)) {
    score += 12;
    reasons.push("Both chose to share an active GO hunger signal");
  }
  if (left.goal && right.goal && left.goal.toLocaleLowerCase() === right.goal.toLocaleLowerCase()) {
    score += 8;
    reasons.push("Same collaboration goal");
  }
  return { score: Math.min(score, 100), reasons, eligible: true };
}

export function summarizeJourney(events = []) {
  const counts = {
    gameJamsAttended: 0,
    collaborationsAccepted: 0,
    skillsValidated: 0,
  };
  for (const event of events) {
    if (event.status === "corrected" || event.status === "revoked") continue;
    if (event.type === "game_jam_attended") counts.gameJamsAttended++;
    if (event.type === "match_accepted") counts.collaborationsAccepted++;
    if (event.type === "skill_validated") counts.skillsValidated++;
  }
  return counts;
}

export function publicJourneyEvent(event = {}) {
  const date = validDate(event.occurredAt);
  if (!date || event.visibility !== "public" || event.status === "corrected" || event.status === "revoked") return null;
  return {
    id: String(event.id || "").slice(0, 80),
    type: String(event.type || "milestone").slice(0, 60),
    title: String(event.publicTitle || event.title || "GO development milestone").slice(0, 120),
    summary: String(event.publicSummary || event.summary || "").slice(0, 240),
    occurredAt: date.toISOString(),
    stardate: formatGoStardate(date),
  };
}

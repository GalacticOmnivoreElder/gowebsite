import { NextResponse } from "next/server";
import {
  DEFAULT_SKILL_DIRECTORY,
  LANDING_FALLBACK_SKILLS,
} from "@/constants/skills";
import { getSkillDocumentId } from "@/lib/skills";
import { getPopularSkills, getSkillCatalog } from "@/lib/skill-catalog";

function fallbackDirectory() {
  return DEFAULT_SKILL_DIRECTORY.map(({ name, category }) => ({
    id: getSkillDocumentId(name),
    name,
    category,
    active: true,
    status: "approved",
    source: "default",
    usageCount: 0,
  }));
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const popular = searchParams.get("popular") === "true";
  const requestedLimit = Number(searchParams.get("limit")) || 14;
  const limit = Math.min(Math.max(requestedLimit, 1), 30);

  try {
    const skills = popular
      ? await getPopularSkills(limit)
      : await getSkillCatalog();
    return NextResponse.json(
      { skills },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      }
    );
  } catch (error) {
    console.error("GET /api/skills failed; using static catalogue", error);
    const directory = fallbackDirectory();
    const skills = popular
      ? LANDING_FALLBACK_SKILLS.slice(0, limit).map(
          (name) => directory.find((skill) => skill.name === name) || {
            id: getSkillDocumentId(name),
            name,
            category: "Other",
            active: true,
            status: "approved",
            source: "default",
            usageCount: 0,
          }
        )
      : directory;
    return NextResponse.json({ skills, fallback: true });
  }
}

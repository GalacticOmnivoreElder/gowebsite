import { NextResponse } from "next/server";
import { getRequestUser } from "@/lib/auth-utils";
import {
  createCatalogSkill,
  getSkillCatalog,
  rebuildSkillUsage,
  updateCatalogSkill,
} from "@/lib/skill-catalog";
import { SKILL_CATEGORIES } from "@/constants/skills";
import {
  MAX_SKILL_NAME_LENGTH,
  normalizeSkillName,
} from "@/lib/skills";

async function requireAdmin(request) {
  const user = await getRequestUser(request);
  if (!user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  if (!user.admin) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { user };
}

export async function GET(request) {
  const auth = await requireAdmin(request);
  if (auth.error) return auth.error;

  try {
    const skills = await getSkillCatalog({ includeInactive: true });
    return NextResponse.json({ skills });
  } catch (error) {
    console.error("GET /api/admin/skills failed", error);
    return NextResponse.json(
      { error: "Unable to load the skill directory." },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  const auth = await requireAdmin(request);
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    if (body.action === "rebuild") {
      const skills = await rebuildSkillUsage({ adminUserId: auth.user.uid });
      return NextResponse.json({ skills });
    }

    const name = normalizeSkillName(body.name);
    if (!name || name.length > MAX_SKILL_NAME_LENGTH) {
      return NextResponse.json(
        { error: `Skill names must be 1–${MAX_SKILL_NAME_LENGTH} characters.` },
        { status: 400 }
      );
    }
    if (!SKILL_CATEGORIES.includes(body.category)) {
      return NextResponse.json({ error: "Invalid category." }, { status: 400 });
    }

    const skill = await createCatalogSkill({
      name,
      category: body.category,
      adminUserId: auth.user.uid,
    });
    return NextResponse.json({ skill }, { status: 201 });
  } catch (error) {
    console.error("POST /api/admin/skills failed", error);
    return NextResponse.json(
      { error: error.message || "Unable to update the skill directory." },
      { status: 500 }
    );
  }
}

export async function PUT(request) {
  const auth = await requireAdmin(request);
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    if (!body.id) {
      return NextResponse.json({ error: "Skill id is required." }, { status: 400 });
    }
    if (body.category && !SKILL_CATEGORIES.includes(body.category)) {
      return NextResponse.json({ error: "Invalid category." }, { status: 400 });
    }

    const skill = await updateCatalogSkill({
      id: body.id,
      category: body.category,
      active: body.active,
      adminUserId: auth.user.uid,
    });
    return NextResponse.json({ skill });
  } catch (error) {
    console.error("PUT /api/admin/skills failed", error);
    const status = error.message === "Skill not found." ? 404 : 500;
    return NextResponse.json(
      { error: error.message || "Unable to update the skill." },
      { status }
    );
  }
}

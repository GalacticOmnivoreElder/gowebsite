import { NextResponse } from "next/server";
import { getRequestUser } from "@/lib/auth-utils";
import { adminDb } from "@/lib/firebase-admin";
import { PUBLIC_PROJECT_STATUSES } from "@/lib/project-utils";

async function getUserFromToken(request) {
  return getRequestUser(request);
}

async function fetchProjectsByIds(projectIds) {
  if (!projectIds || projectIds.length === 0) return [];

  try {
    const projectPromises = projectIds.map(async (projectId) => {
      try {
        const projectDoc = await adminDb
          .collection("projects")
          .doc(projectId)
          .get();
        if (projectDoc.exists) {
          const data = projectDoc.data();
          return {
            id: projectDoc.id,
            title: data.title,
            description: data.description,
            goal: data.goal,
            thumbnail: data.thumbnail,
            status: data.status,
            visibility: data.visibility,
            archived: data.archived === true,
            type: data.type,
            categoryTags: data.categoryTags,
            budget: data.budget,
            duration: data.duration,
            compensationType: data.compensationType,
            requiredRoles: data.requiredRoles,
            createdAt:
              data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
            updatedAt:
              data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
          };
        }
        return null;
      } catch (error) {
        console.error(`Error fetching project ${projectId}:`, error);
        return null;
      }
    });

    const results = await Promise.all(projectPromises);
    return results.filter((project) => project !== null);
  } catch (error) {
    console.error("Error fetching projects:", error);
    return [];
  }
}

export async function GET(request, { params }) {
  try {
    const { id: userId } = await params;
    const requestingUser = await getUserFromToken(request);

    // Check if user exists
    const userDoc = await adminDb.collection("users").doc(userId).get();
    if (!userDoc.exists) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const userData = userDoc.data();
    const isOwnProfile = requestingUser?.uid === userId;
    const isAdmin = requestingUser?.admin === true;

    // Only allow viewing own projects or if profile is public
    if (!isOwnProfile && !isAdmin && userData.profilePrivacy === "private") {
      return NextResponse.json(
        { error: "This user's profile is private" },
        { status: 403 }
      );
    }

    // Get project IDs from user document
    const ownerProjectIds = userData.ownerOfProjects || [];
    const adminProjectIds = userData.adminOfProjects || [];
    const teamMemberProjectIds = userData.teamMemberOfProjects || [];

    // Fetch project details
    const [ownerProjects, adminProjects, teamMemberProjects] =
      await Promise.all([
        fetchProjectsByIds(ownerProjectIds),
        fetchProjectsByIds(adminProjectIds),
        fetchProjectsByIds(teamMemberProjectIds),
      ]);

    // For other viewers, only surface projects that are genuinely public:
    // Public visibility AND in a discoverable lifecycle status (no drafts/pending/rejected).
    const filterProjects = (projects) => {
      // Owner (and platform admins) see everything, including archived, so they
      // can restore. Everyone else never sees archived projects.
      if (isOwnProfile || isAdmin) return projects;
      return projects.filter(
        (project) =>
          !project.archived &&
          project.visibility === "Public" &&
          PUBLIC_PROJECT_STATUSES.includes(project.status)
      );
    };

    return NextResponse.json({
      ownerProjects: filterProjects(ownerProjects),
      adminProjects: filterProjects(adminProjects),
      teamMemberProjects: filterProjects(teamMemberProjects),
      totalProjects:
        ownerProjects.length + adminProjects.length + teamMemberProjects.length,
    });
  } catch (error) {
    console.error("Error fetching user projects:", error);
    return NextResponse.json(
      { error: "Failed to fetch user projects" },
      { status: 500 }
    );
  }
}

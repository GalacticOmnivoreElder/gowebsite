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
            startDate: data.startDate,
            endDate: data.endDate,
            isOngoing: data.isOngoing === true,
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
    const { searchParams } = new URL(request.url);
    const managementScope = searchParams.get("scope") === "management";

    const [userDoc, cvDoc] = await Promise.all([
      adminDb.collection("users").doc(userId).get(),
      adminDb.collection("go_cvs").doc(userId).get(),
    ]);
    if (!userDoc.exists) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const userData = userDoc.data();
    const isOwnProfile = requestingUser?.uid === userId;
    const isAdmin = requestingUser?.admin === true;

    if (managementScope && !isOwnProfile && !isAdmin) {
      return NextResponse.json(
        { error: "Management project history is only available to its owner." },
        { status: 403 }
      );
    }

    const cvData = cvDoc.exists ? cvDoc.data() : null;
    const isPublicProfile = cvDoc.exists
      ? cvData?.status === "active" && cvData.visibility_public === true
      : userData.profilePrivacy !== "private";

    if (!isOwnProfile && !isAdmin && !isPublicProfile) {
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
      if (managementScope) return projects;
      // This endpoint powers the public profile, so its response must not change
      // based on the viewer's owner/admin privileges. Management endpoints are
      // responsible for authorized access to drafts and archived projects.
      return projects.filter(
        (project) =>
          !project.archived &&
          project.visibility === "Public" &&
          PUBLIC_PROJECT_STATUSES.includes(project.status)
      );
    };

    const visibleOwnerProjects = filterProjects(ownerProjects);
    const visibleAdminProjects = filterProjects(adminProjects);
    const visibleTeamMemberProjects = filterProjects(teamMemberProjects);

    return NextResponse.json({
      ownerProjects: visibleOwnerProjects,
      adminProjects: visibleAdminProjects,
      teamMemberProjects: visibleTeamMemberProjects,
      totalProjects:
        visibleOwnerProjects.length +
        visibleAdminProjects.length +
        visibleTeamMemberProjects.length,
      scope: managementScope ? "management" : "public",
    });
  } catch (error) {
    console.error("Error fetching user projects:", error);
    return NextResponse.json(
      { error: "Failed to fetch user projects" },
      { status: 500 }
    );
  }
}

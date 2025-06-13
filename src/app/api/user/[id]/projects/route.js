import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

async function getUserFromToken(request) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return null;
    }

    const token = authHeader.substring(7);
    const decodedToken = await adminAuth.verifyIdToken(token);
    return decodedToken;
  } catch (error) {
    console.error("Error verifying token:", error);
    return null;
  }
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
    const { id: userId } = params;
    const requestingUser = await getUserFromToken(request);

    // Check if user exists
    const userDoc = await adminDb.collection("users").doc(userId).get();
    if (!userDoc.exists) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const userData = userDoc.data();
    const isOwnProfile = requestingUser?.uid === userId;

    // Only allow viewing own projects or if profile is public
    if (!isOwnProfile && userData.profilePrivacy === "private") {
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

    // Filter out private projects if not viewing own profile
    const filterProjects = (projects) => {
      if (isOwnProfile) return projects;
      return projects.filter((project) => project.visibility === "Public");
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

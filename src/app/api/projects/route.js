import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

// Project types and compensation types - these should match your requirements
const PROJECT_TYPES = [
  "Game Development",
  "Art & Design",
  "Programming",
  "Music & Audio",
  "Writing & Narrative",
  "Marketing",
  "Other",
];

const COMPENSATION_TYPES = [
  "Paid",
  "Revenue Share",
  "Portfolio/Experience",
  "Volunteer",
  "Equity",
  "Hybrid",
];

const REQUIRED_ROLES = [
  "Game Designer",
  "Programmer",
  "C# Developer",
  "Unity Developer",
  "Unreal Developer",
  "2D Artist",
  "3D Artist",
  "UI/UX Designer",
  "Animator",
  "Sound Designer",
  "Composer",
  "Writer",
  "Narrative Designer",
  "Project Manager",
  "Producer",
  "QA Tester",
  "Marketing Specialist",
  "Other",
];

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

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const search = searchParams.get("search") || "";
    const category = searchParams.get("category") || "all";
    const type = searchParams.get("type") || "all";
    const visibility = searchParams.get("visibility") || "all";
    const status = searchParams.get("status") || "all";
    const sortBy = searchParams.get("sortBy") || "created_desc";

    // Get user to determine what projects they can see
    const user = await getUserFromToken(request);

    let query = adminDb.collection("projects");

    // Apply filters
    if (status !== "all") {
      query = query.where("status", "==", status);
    } else {
      // By default, only show live projects to non-admin users
      if (!user) {
        query = query.where("status", "==", "live");
        query = query.where("visibility", "==", "Public");
      } else {
        // For authenticated users, show live projects by default
        // but they can filter to see drafts if they're admin/owner
        query = query.where("status", "==", "live");
      }
    }

    if (type !== "all") {
      query = query.where("type", "==", type);
    }

    if (visibility !== "all") {
      query = query.where("visibility", "==", visibility);
    } else if (!user) {
      // Non-authenticated users can only see public projects
      query = query.where("visibility", "==", "Public");
    }

    // Apply sorting
    const [sortField, sortDirection] = sortBy.split("_");
    const firebaseSortField = sortField === "created" ? "createdAt" : sortField;
    query = query.orderBy(
      firebaseSortField,
      sortDirection === "desc" ? "desc" : "asc"
    );

    // Apply pagination
    const offset = (page - 1) * limit;
    if (offset > 0) {
      const offsetQuery = adminDb
        .collection("projects")
        .orderBy(firebaseSortField, sortDirection === "desc" ? "desc" : "asc")
        .limit(offset);
      const offsetSnapshot = await offsetQuery.get();
      if (!offsetSnapshot.empty) {
        const lastDoc = offsetSnapshot.docs[offsetSnapshot.docs.length - 1];
        query = query.startAfter(lastDoc);
      }
    }

    query = query.limit(limit + 1); // Get one extra to check if there are more

    const snapshot = await query.get();
    const projects = [];

    // Fetch sourceProject names for projects that have them
    const projectsWithSourceProjectIds = [];
    const sourceProjectIds = new Set();

    snapshot.docs.slice(0, limit).forEach((doc) => {
      const data = doc.data();
      const project = {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
      };

      projectsWithSourceProjectIds.push(project);
      if (project.sourceProject) {
        sourceProjectIds.add(project.sourceProject);
      }
    });

    // Fetch sourceProject details
    const sourceProjectsMap = new Map();
    if (sourceProjectIds.size > 0) {
      try {
        const sourceProjectPromises = Array.from(sourceProjectIds).map(
          async (id) => {
            const doc = await adminDb
              .collection("sourceProjects")
              .doc(id)
              .get();
            if (doc.exists) {
              const data = doc.data();
              return {
                id: doc.id,
                name: data.name,
              };
            }
            return null;
          }
        );

        const sourceProjectResults = await Promise.all(sourceProjectPromises);
        sourceProjectResults.forEach((sp) => {
          if (sp) {
            sourceProjectsMap.set(sp.id, sp);
          }
        });
      } catch (error) {
        console.error("Error fetching source projects:", error);
      }
    }

    // Apply search filter and add sourceProject details
    projectsWithSourceProjectIds.forEach((project) => {
      // Add sourceProject details if available
      if (
        project.sourceProject &&
        sourceProjectsMap.has(project.sourceProject)
      ) {
        project.sourceProjectDetails = sourceProjectsMap.get(
          project.sourceProject
        );
      }

      // Apply search filter (client-side for now, could be improved with Algolia)
      if (search) {
        const searchLower = search.toLowerCase();
        const matchesSearch =
          project.title?.toLowerCase().includes(searchLower) ||
          project.description?.toLowerCase().includes(searchLower) ||
          project.goal?.toLowerCase().includes(searchLower) ||
          project.categoryTags?.some((tag) =>
            tag.toLowerCase().includes(searchLower)
          );

        if (matchesSearch) {
          projects.push(project);
        }
      } else {
        projects.push(project);
      }
    });

    // Apply category filter (if category tags include the specified category)
    let filteredProjects = projects;
    if (category !== "all") {
      filteredProjects = projects.filter((project) =>
        project.categoryTags?.includes(category)
      );
    }

    const hasMore = snapshot.docs.length > limit;

    return NextResponse.json({
      projects: filteredProjects,
      hasMore,
      pagination: {
        page,
        limit,
        total: filteredProjects.length,
      },
    });
  } catch (error) {
    console.error("Error fetching projects:", error);
    return NextResponse.json(
      { error: "Failed to fetch projects", details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const projectData = await request.json();

    // Validate required fields
    const requiredFields = [
      "title",
      "description",
      "goal",
      "type",
      "visibility",
      "duration",
      "budget",
      "compensationType",
      "requiredRoles",
    ];
    for (const field of requiredFields) {
      if (!projectData[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    // Validate enums
    if (!PROJECT_TYPES.includes(projectData.type)) {
      return NextResponse.json(
        { error: "Invalid project type" },
        { status: 400 }
      );
    }

    if (
      !["Public", "Private", "Invite Only"].includes(projectData.visibility)
    ) {
      return NextResponse.json(
        { error: "Invalid visibility option" },
        { status: 400 }
      );
    }

    if (!COMPENSATION_TYPES.includes(projectData.compensationType)) {
      return NextResponse.json(
        { error: "Invalid compensation type" },
        { status: 400 }
      );
    }

    // Handle sourceProject logic
    let sourceProjectId = null;

    if (projectData.sourceProjectOption === "new") {
      // Create new sourceProject
      if (
        !projectData.sourceProjectName ||
        projectData.sourceProjectName.trim().length < 3 ||
        projectData.sourceProjectName.trim().length > 50
      ) {
        return NextResponse.json(
          { error: "Source project name must be between 3 and 50 characters" },
          { status: 400 }
        );
      }

      const sourceProjectData = {
        name: projectData.sourceProjectName.trim(),
        sourceOwner: user.uid,
        projectIds: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const sourceProjectRef = await adminDb
        .collection("sourceProjects")
        .add(sourceProjectData);
      sourceProjectId = sourceProjectRef.id;
    } else if (
      projectData.sourceProjectOption === "existing" &&
      projectData.existingSourceProjectId
    ) {
      // Validate that the user owns the existing sourceProject
      const sourceProjectDoc = await adminDb
        .collection("sourceProjects")
        .doc(projectData.existingSourceProjectId)
        .get();

      if (!sourceProjectDoc.exists) {
        return NextResponse.json(
          { error: "Selected source project not found" },
          { status: 400 }
        );
      }

      const sourceProjectData = sourceProjectDoc.data();
      if (sourceProjectData.sourceOwner !== user.uid) {
        return NextResponse.json(
          { error: "You don't have permission to use this source project" },
          { status: 403 }
        );
      }

      sourceProjectId = projectData.existingSourceProjectId;
    } else {
      return NextResponse.json(
        { error: "Invalid source project option" },
        { status: 400 }
      );
    }

    // Create the project
    const newProject = {
      ...projectData,
      owner: user.uid,
      admins: [user.uid],
      teamMembers: [user.uid],
      status: "draft", // Always start as draft
      sourceProject: sourceProjectId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Remove sourceProject-related fields that shouldn't be stored in the project
    delete newProject.sourceProjectOption;
    delete newProject.sourceProjectName;
    delete newProject.existingSourceProjectId;

    const docRef = await adminDb.collection("projects").add(newProject);
    const projectId = docRef.id;

    // Update sourceProject to include this project ID
    try {
      const sourceProjectRef = adminDb
        .collection("sourceProjects")
        .doc(sourceProjectId);
      const sourceProjectDoc = await sourceProjectRef.get();

      if (sourceProjectDoc.exists) {
        const sourceProjectData = sourceProjectDoc.data();
        const updatedProjectIds = [
          ...(sourceProjectData.projectIds || []),
          projectId,
        ];

        await sourceProjectRef.update({
          projectIds: updatedProjectIds,
          updatedAt: new Date(),
        });

        console.log(
          `✅ Updated sourceProject ${sourceProjectId} with new project ${projectId}`
        );
      }
    } catch (error) {
      console.error("Error updating sourceProject:", error);
      // Don't fail the project creation if sourceProject update fails
    }

    // Update user's project arrays
    try {
      const userRef = adminDb.collection("users").doc(user.uid);
      const userDoc = await userRef.get();

      if (userDoc.exists) {
        const userData = userDoc.data();
        const updates = {
          ownerOfProjects: [...(userData.ownerOfProjects || []), projectId],
          adminOfProjects: [...(userData.adminOfProjects || []), projectId],
          teamMemberOfProjects: [
            ...(userData.teamMemberOfProjects || []),
            projectId,
          ],
          updatedAt: new Date(),
        };

        await userRef.update(updates);
        console.log(
          `✅ Updated user ${user.uid} project arrays for new project ${projectId}`
        );
      } else {
        console.log(
          `⚠️ User document ${user.uid} not found when updating project arrays`
        );
      }
    } catch (error) {
      console.error("Error updating user project arrays:", error);
      // Don't fail the project creation if user update fails
    }

    return NextResponse.json({
      id: projectId,
      ...newProject,
      createdAt: newProject.createdAt.toISOString(),
      updatedAt: newProject.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error("Error creating project:", error);
    return NextResponse.json(
      { error: "Failed to create project", details: error.message },
      { status: 500 }
    );
  }
}

// Export the constants for use in other components
export { PROJECT_TYPES, COMPENSATION_TYPES, REQUIRED_ROLES };

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

    snapshot.docs.slice(0, limit).forEach((doc) => {
      const data = doc.data();

      // Convert Firestore timestamps to ISO strings
      const project = {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
      };

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

    // Create the project
    const newProject = {
      ...projectData,
      owner: user.uid,
      admins: [user.uid],
      teamMembers: [user.uid],
      status: "draft", // Always start as draft
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const docRef = await adminDb.collection("projects").add(newProject);

    return NextResponse.json({
      id: docRef.id,
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

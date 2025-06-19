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

async function enrichApplicationWithUserDetails(application) {
  try {
    // Get user details from users collection
    const userDoc = await adminDb
      .collection("users")
      .doc(application.userId)
      .get();

    if (userDoc.exists) {
      const userData = userDoc.data();
      return {
        ...application,
        // Inject user details
        username: userData.username || userData.name || "Unknown User",
        userEmail: userData.email || "No email",
        avatar: userData.avatar || null,
      };
    } else {
      // Fallback: try to get from Firebase Auth
      try {
        const authUser = await adminAuth.getUser(application.userId);
        return {
          ...application,
          username:
            authUser.displayName ||
            authUser.email?.split("@")[0] ||
            "Unknown User",
          userEmail: authUser.email || "No email",
          avatar: authUser.photoURL || null,
        };
      } catch (authError) {
        console.error(
          `Error fetching auth user ${application.userId}:`,
          authError
        );
        return {
          ...application,
          username: "Unknown User",
          userEmail: "No email",
          avatar: null,
        };
      }
    }
  } catch (error) {
    console.error("Error enriching application with user details:", error);
    return {
      ...application,
      username: "Unknown User",
      userEmail: "No email",
      avatar: null,
    };
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

    const { projectId, projectTitle } = await request.json();

    if (!projectId) {
      return NextResponse.json(
        { error: "Project ID is required" },
        { status: 400 }
      );
    }

    // Check if project exists
    const projectDoc = await adminDb
      .collection("projects")
      .doc(projectId)
      .get();
    if (!projectDoc.exists) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const projectData = projectDoc.data();

    // Check if user is already a member of the project
    if (
      projectData.owner === user.uid ||
      projectData.admins?.includes(user.uid) ||
      projectData.teamMembers?.includes(user.uid)
    ) {
      return NextResponse.json(
        { error: "You are already a member of this project" },
        { status: 400 }
      );
    }

    // Check if user has already applied
    const existingApplication = await adminDb
      .collection("applications")
      .where("projectId", "==", projectId)
      .where("userId", "==", user.uid)
      .where("status", "in", ["pending", "approved"])
      .get();

    if (!existingApplication.empty) {
      return NextResponse.json(
        { error: "You have already applied to this project" },
        { status: 400 }
      );
    }

    // Create application (only store essential data, user details will be fetched dynamically)
    const applicationData = {
      projectId,
      projectTitle: projectTitle || projectData.title,
      userId: user.uid,
      status: "pending",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const applicationRef = await adminDb
      .collection("applications")
      .add(applicationData);

    const baseApplication = {
      id: applicationRef.id,
      ...applicationData,
      createdAt: applicationData.createdAt.toISOString(),
      updatedAt: applicationData.updatedAt.toISOString(),
    };

    // Enrich with user details before returning
    const enrichedApplication =
      await enrichApplicationWithUserDetails(baseApplication);

    return NextResponse.json(enrichedApplication);
  } catch (error) {
    console.error("Error creating application:", error);
    return NextResponse.json(
      { error: "Failed to create application", details: error.message },
      { status: 500 }
    );
  }
}

export async function GET(request) {
  try {
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");

    let query = adminDb.collection("applications");

    if (projectId) {
      // Get applications for a specific project (for project owners/admins)
      const projectDoc = await adminDb
        .collection("projects")
        .doc(projectId)
        .get();
      if (!projectDoc.exists) {
        return NextResponse.json(
          { error: "Project not found" },
          { status: 404 }
        );
      }

      const projectData = projectDoc.data();
      if (
        projectData.owner !== user.uid &&
        !projectData.admins?.includes(user.uid)
      ) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 });
      }

      query = query.where("projectId", "==", projectId);
    } else {
      // Get user's own applications
      query = query.where("userId", "==", user.uid);
    }

    const snapshot = await query.orderBy("createdAt", "desc").get();
    const applications = [];

    // First, collect all applications with basic data
    snapshot.forEach((doc) => {
      const data = doc.data();
      applications.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
      });
    });

    // Then enrich each application with user details
    const enrichedApplications = await Promise.all(
      applications.map((app) => enrichApplicationWithUserDetails(app))
    );

    return NextResponse.json({ applications: enrichedApplications });
  } catch (error) {
    console.error("Error fetching applications:", error);
    return NextResponse.json(
      { error: "Failed to fetch applications", details: error.message },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { getRequestUser } from "@/lib/auth-utils";
import { canViewProject } from "@/lib/project-utils";

async function getUserFromToken(request) {
  return getRequestUser(request);
}

function serializeApplicationDate(value) {
  const date = value?.toDate?.() || value;
  return date instanceof Date ? date.toISOString() : date;
}

function applicationTime(value) {
  const date = value?.toDate?.() || value;
  const time = date instanceof Date ? date.getTime() : new Date(date || 0).getTime();
  return Number.isFinite(time) ? time : 0;
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

    // Applying to projects is a membership benefit — require an active
    // subscription (any tier) or platform admin.
    if (!user.activeMember && !user.admin) {
      return NextResponse.json(
        {
          error:
            "An active membership is required to apply to projects. Subscribe to unlock applications.",
          code: "membership_required",
        },
        { status: 403 }
      );
    }

    const { projectId, roleAppliedFor, motivation, availability } =
      await request.json();

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

    if (!canViewProject(projectData, user)) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    if (projectData.status !== "hiring") {
      return NextResponse.json(
        { error: "This project is not currently accepting applications" },
        { status: 400 }
      );
    }

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

    // Snapshot the applicant's active GO CV at application time, so later CV
    // edits never change the historical application (spec requirement).
    let goCvSnapshot = null;
    try {
      const cvSnap = await adminDb.collection("go_cvs").doc(user.uid).get();
      if (cvSnap.exists) {
        const cv = cvSnap.data();
        goCvSnapshot = {
          title: cv.title || null,
          summary: cv.summary || null,
          sections: cv.sections || [],
          primary_role: cv.primary_role || null,
          skill_level: cv.skill_level || null,
          snapshottedAt: new Date(),
        };
      }
    } catch (snapErr) {
      console.error("Failed to snapshot GO CV for application:", snapErr);
    }

    // Create application (user details are fetched dynamically on read).
    const applicationData = {
      projectId,
      projectTitle: projectData.title,
      userId: user.uid,
      roleAppliedFor: roleAppliedFor || null,
      motivation: motivation || null,
      availability: availability || null,
      goCvSnapshot,
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
        !projectData.admins?.includes(user.uid) &&
        !user.admin
      ) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 });
      }

      query = query.where("projectId", "==", projectId);
    } else {
      // Get user's own applications
      query = query.where("userId", "==", user.uid);
    }

    // Sorting a filtered query in Firestore requires a separately deployed
    // composite index. Fetch the already-filtered result and sort it here so
    // applicant lists work in every environment without hidden index setup.
    const snapshot = await query.get();
    const applications = [];

    // First, collect all applications with basic data
    snapshot.forEach((doc) => {
      const data = doc.data();
      applications.push({
        id: doc.id,
        ...data,
        createdAt: serializeApplicationDate(data.createdAt),
        updatedAt: serializeApplicationDate(data.updatedAt),
      });
    });

    applications.sort(
      (left, right) =>
        applicationTime(right.createdAt) - applicationTime(left.createdAt)
    );

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

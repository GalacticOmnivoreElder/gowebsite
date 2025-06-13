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

export async function GET(request, { params }) {
  try {
    const { id: userId } = params;
    const requestingUser = await getUserFromToken(request);

    // Fetch the user document
    const userDoc = await adminDb.collection("users").doc(userId).get();

    if (!userDoc.exists) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const userData = userDoc.data();
    const isOwnProfile = requestingUser?.uid === userId;

    // Check if profile is private and user is not viewing their own profile
    if (userData.profilePrivacy === "private" && !isOwnProfile) {
      return NextResponse.json({
        id: userId,
        username: userData.username || "Unknown User",
        avatar: userData.avatar || null,
        isPrivate: true,
      });
    }

    // Prepare public profile data
    const publicProfile = {
      id: userId,
      username: userData.username || "Unknown User",
      avatar: userData.avatar || null,
      skills: userData.skills || [],
      bio: userData.bio || "",
      joinedAt:
        userData.createdAt?.toDate?.()?.toISOString() || userData.createdAt,
      isPrivate: false,
    };

    // Add social links based on visibility settings
    if (userData.socialLinks && userData.socialVisibility) {
      publicProfile.socialLinks = {};
      Object.keys(userData.socialLinks).forEach((platform) => {
        if (userData.socialVisibility[platform] === true || isOwnProfile) {
          publicProfile.socialLinks[platform] = userData.socialLinks[platform];
        }
      });
    }

    // If viewing own profile, include private data and project arrays
    if (isOwnProfile) {
      publicProfile.email = userData.email;
      publicProfile.profilePrivacy = userData.profilePrivacy || "public";
      publicProfile.socialVisibility = userData.socialVisibility || {};
      publicProfile.ownerOfProjects = userData.ownerOfProjects || [];
      publicProfile.adminOfProjects = userData.adminOfProjects || [];
      publicProfile.teamMemberOfProjects = userData.teamMemberOfProjects || [];
    }

    return NextResponse.json(publicProfile);
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return NextResponse.json(
      { error: "Failed to fetch user profile" },
      { status: 500 }
    );
  }
}

export async function PUT(request, { params }) {
  try {
    const { id: userId } = params;
    const requestingUser = await getUserFromToken(request);

    if (!requestingUser) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Users can only update their own profile
    if (requestingUser.uid !== userId) {
      return NextResponse.json(
        { error: "Access denied. You can only update your own profile." },
        { status: 403 }
      );
    }

    const updateData = await request.json();

    // Define allowed fields for profile updates
    const allowedFields = [
      "username",
      "bio",
      "skills",
      "socialLinks",
      "socialVisibility",
      "profilePrivacy",
      "avatar",
    ];

    const filteredUpdateData = {};
    allowedFields.forEach((field) => {
      if (updateData[field] !== undefined) {
        filteredUpdateData[field] = updateData[field];
      }
    });

    if (Object.keys(filteredUpdateData).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
    }

    // Add update timestamp
    filteredUpdateData.updatedAt = new Date();

    // Update the user document
    await adminDb.collection("users").doc(userId).update(filteredUpdateData);

    // Fetch and return updated user data
    const updatedDoc = await adminDb.collection("users").doc(userId).get();
    const updatedData = updatedDoc.data();

    return NextResponse.json({
      id: userId,
      username: updatedData.username,
      bio: updatedData.bio,
      skills: updatedData.skills,
      socialLinks: updatedData.socialLinks,
      socialVisibility: updatedData.socialVisibility,
      profilePrivacy: updatedData.profilePrivacy,
      avatar: updatedData.avatar,
      updatedAt:
        updatedData.updatedAt?.toDate?.()?.toISOString() ||
        updatedData.updatedAt,
    });
  } catch (error) {
    console.error("Error updating user profile:", error);
    return NextResponse.json(
      { error: "Failed to update user profile" },
      { status: 500 }
    );
  }
}

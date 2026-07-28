import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { serializeFirestoreDate } from "@/lib/project-utils";
import { validateProfileData } from "@/utils/validateProfile";
import { normalizeUsername } from "@/lib/auth-profile";
import { sanitizeSkills } from "@/lib/skills";
import { syncUserSkillUsage } from "@/lib/skill-catalog";

function serializeCv(cv) {
  if (!cv) return null;

  return {
    ...cv,
    created_at: serializeFirestoreDate(cv.created_at),
    updated_at: serializeFirestoreDate(cv.updated_at),
    published_at: serializeFirestoreDate(cv.published_at),
  };
}

function getCvSection(cv, sectionType) {
  return cv?.sections?.find((section) => section.section_type === sectionType)
    ?.content_json;
}

function getCvDisplayData(cv) {
  const contact = getCvSection(cv, "contact") || {};
  const skills = getCvSection(cv, "skills") || {};
  const tools = getCvSection(cv, "tools") || {};

  return {
    displayName: contact.display_name,
    skills: [
      skills.primary_role,
      ...(skills.secondary_roles || []),
      ...(tools.tools || []),
    ].filter(Boolean),
  };
}

function serializeDate(value) {
  return value?.toDate?.()?.toISOString() || value || null;
}

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
    const { id: userId } = await params;
    const requestingUser = await getUserFromToken(request);

    const [userDoc, cvDoc] = await Promise.all([
      adminDb.collection("users").doc(userId).get(),
      adminDb.collection("go_cvs").doc(userId).get(),
    ]);

    if (!userDoc.exists && !cvDoc.exists) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const userData = userDoc.exists ? userDoc.data() : {};
    const cvData = cvDoc.exists ? cvDoc.data() : null;
    const isOwnProfile = requestingUser?.uid === userId;
    const isPublicCv =
      cvData?.status === "active" && cvData.visibility_public === true;
    const canViewCv = isOwnProfile || isPublicCv;
    const isPrivateProfile = cvDoc.exists
      ? !canViewCv
      : userData.profilePrivacy === "private" && !isOwnProfile;

    // Published GO CV visibility is authoritative for onboarded users. Users
    // without a GO CV continue to use the legacy profilePrivacy setting.
    if (isPrivateProfile) {
      return NextResponse.json({
        id: userId,
        username: userData.username || "Unknown User",
        avatar: userData.avatar || null,
        isPrivate: true,
      });
    }

    const cvDisplayData = canViewCv ? getCvDisplayData(cvData) : null;
    const hasExplicitProfileEdits = !!userData.profileEditedAt;
    const hasEditedSkills =
      hasExplicitProfileEdits && Array.isArray(userData.skills);
    const hasEditedBio =
      hasExplicitProfileEdits &&
      Object.prototype.hasOwnProperty.call(userData, "bio");
    const storedBio = String(userData.bio || "");
    const legacyAboutMe =
      !userData.aboutMe && storedBio.length > 150 ? storedBio : "";
    const memberSince =
      serializeDate(userData.membershipActivatedAt) ||
      serializeDate(userData.createdAt);

    const publicProfile = {
      id: userId,
      username:
        (hasExplicitProfileEdits && userData.username) ||
        cvDisplayData?.displayName ||
        userData.username ||
        "Unknown User",
      avatar: userData.avatar || null,
      skills:
        hasEditedSkills
          ? userData.skills
          : cvDisplayData?.skills?.length > 0
          ? [...new Set(cvDisplayData.skills)]
          : userData.skills || [],
      bio: hasEditedBio
        ? storedBio.slice(0, 150)
        : storedBio.length <= 150
        ? storedBio
        : "",
      aboutMe: userData.aboutMe || legacyAboutMe,
      joinedAt:
        serializeDate(userData.createdAt),
      memberSince,
      profilePrivacy: "public",
      isPrivate: false,
      cv: canViewCv ? serializeCv(cvData) : null,
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
      { status: 500 },
    );
  }
}

export async function PUT(request, { params }) {
  try {
    const { id: userId } = await params;
    const requestingUser = await getUserFromToken(request);

    if (!requestingUser) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    // Users can only update their own profile
    if (requestingUser.uid !== userId) {
      return NextResponse.json(
        { error: "Access denied. You can only update your own profile." },
        { status: 403 },
      );
    }

    const updateData = await request.json();

    // Define allowed fields for profile updates
    const allowedFields = [
      "username",
      "bio",
      "aboutMe",
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
        { status: 400 },
      );
    }

    const validationErrors = validateProfileData(filteredUpdateData);
    if (Object.keys(validationErrors).length > 0) {
      return NextResponse.json(
        { error: Object.values(validationErrors)[0], validationErrors },
        { status: 400 },
      );
    }

    if (filteredUpdateData.username !== undefined) {
      filteredUpdateData.username = normalizeUsername(
        filteredUpdateData.username
      );
    }
    if (filteredUpdateData.skills !== undefined) {
      filteredUpdateData.skills = sanitizeSkills(filteredUpdateData.skills);
    }

    const now = new Date();
    filteredUpdateData.profileEditedAt = now;
    filteredUpdateData.updatedAt = now;

    const userReference = adminDb.collection("users").doc(userId);
    const previousDoc = await userReference.get();
    const previousSkills = previousDoc.exists
      ? previousDoc.data().skills || []
      : [];

    await userReference.update(filteredUpdateData);

    const structuredProfileUpdate = {};
    if (filteredUpdateData.username !== undefined) {
      structuredProfileUpdate.display_name = filteredUpdateData.username;
    }
    if (filteredUpdateData.bio !== undefined) {
      structuredProfileUpdate.bio = filteredUpdateData.bio;
    }
    if (filteredUpdateData.aboutMe !== undefined) {
      structuredProfileUpdate.about_me = filteredUpdateData.aboutMe;
    }
    if (filteredUpdateData.skills !== undefined) {
      structuredProfileUpdate.skills = filteredUpdateData.skills;
    }
    if (Object.keys(structuredProfileUpdate).length > 0) {
      const profileReference = adminDb
        .collection("user_profiles")
        .doc(userId);
      const profileDoc = await profileReference.get();
      if (profileDoc.exists) {
        await profileReference.set(
          { ...structuredProfileUpdate, updated_at: now },
          { merge: true }
        );
      }
    }

    if (filteredUpdateData.skills !== undefined) {
      await syncUserSkillUsage({
        previousSkills,
        nextSkills: filteredUpdateData.skills,
        userId,
      });
    }

    if (filteredUpdateData.profilePrivacy !== undefined) {
      const visibilityPublic = filteredUpdateData.profilePrivacy === "public";
      const [profileDoc, cvDoc] = await Promise.all([
        adminDb.collection("user_profiles").doc(userId).get(),
        adminDb.collection("go_cvs").doc(userId).get(),
      ]);
      const visibilityWrites = [];

      if (profileDoc.exists) {
        visibilityWrites.push(
          adminDb
            .collection("user_profiles")
            .doc(userId)
            .set({ visibility_public: visibilityPublic }, { merge: true })
        );
      }
      if (cvDoc.exists) {
        visibilityWrites.push(
          adminDb
            .collection("go_cvs")
            .doc(userId)
            .set({ visibility_public: visibilityPublic }, { merge: true })
        );
      }

      await Promise.all(visibilityWrites);
    }

    // Fetch and return updated user data
    const updatedDoc = await userReference.get();
    const updatedData = updatedDoc.data();

    return NextResponse.json({
      id: userId,
      username: updatedData.username,
      bio: updatedData.bio,
      aboutMe: updatedData.aboutMe,
      skills: updatedData.skills,
      socialLinks: updatedData.socialLinks,
      socialVisibility: updatedData.socialVisibility,
      profilePrivacy: updatedData.profilePrivacy,
      avatar: updatedData.avatar,
      profileEditedAt:
        updatedData.profileEditedAt?.toDate?.()?.toISOString() ||
        updatedData.profileEditedAt,
      updatedAt:
        updatedData.updatedAt?.toDate?.()?.toISOString() ||
        updatedData.updatedAt,
    });
  } catch (error) {
    console.error("Error updating user profile:", error);
    return NextResponse.json(
      { error: "Failed to update user profile" },
      { status: 500 },
    );
  }
}

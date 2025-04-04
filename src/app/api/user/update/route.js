import { adminAuth, adminDb } from "@/lib/firebase-admin";

export async function POST(request) {
  try {
    // Verify authentication
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split("Bearer ")[1];
    let decodedToken;

    try {
      decodedToken = await adminAuth.verifyIdToken(token);
    } catch (error) {
      console.error("Token verification error:", error);
      return Response.json({ error: "Invalid token" }, { status: 401 });
    }

    const uid = decodedToken.uid;

    // Get request body
    const requestData = await request.json();

    // Define allowed fields that can be updated
    const allowedUserFields = ["name", "username"];
    const allowedSettingsFields = [
      "emailNotifications",
      "newPackageAlerts",
      "subscriptionReminders",
      "marketingEmails",
    ];

    // Create update object with only allowed fields
    const updateData = {};

    // Handle user fields
    if (requestData.user) {
      allowedUserFields.forEach((field) => {
        if (requestData.user[field] !== undefined) {
          updateData[field] = requestData.user[field];
        }
      });
    }

    // Handle settings fields
    if (requestData.settings) {
      const settings = {};
      let hasSettings = false;

      allowedSettingsFields.forEach((field) => {
        if (requestData.settings[field] !== undefined) {
          settings[field] = requestData.settings[field];
          hasSettings = true;
        }
      });

      if (hasSettings) {
        updateData.settings = settings;
      }
    }

    // If no valid fields to update, return error
    if (Object.keys(updateData).length === 0) {
      return Response.json(
        {
          error: "No valid fields to update",
        },
        { status: 400 }
      );
    }

    // Update user document
    const userRef = adminDb.collection("users").doc(uid);

    // Get current user data to merge settings properly
    const userDoc = await userRef.get();
    if (!userDoc.exists) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    const userData = userDoc.data();

    // If updating settings, merge with existing settings
    if (updateData.settings && userData.settings) {
      updateData.settings = {
        ...userData.settings,
        ...updateData.settings,
      };
    }

    // Log the update for audit purposes
    console.log("Updating user:", {
      uid,
      updateData,
      timestamp: new Date().toISOString(),
    });

    // Perform the update
    await userRef.update(updateData);

    return Response.json({
      success: true,
      message: "User updated successfully",
      updatedFields: Object.keys(updateData),
    });
  } catch (error) {
    console.error("Error updating user:", error);
    return Response.json(
      {
        error: "Failed to update user",
      },
      { status: 500 }
    );
  }
}

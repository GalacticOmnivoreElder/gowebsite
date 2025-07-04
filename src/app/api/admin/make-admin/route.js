import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

export async function POST(request) {
  try {
    const { uid, email } = await request.json();

    if (!uid && !email) {
      return NextResponse.json(
        { error: "Must provide either uid or email" },
        { status: 400 }
      );
    }

    let targetUid = uid;

    // If email provided, find the user by emails
    if (email && !uid) {
      try {
        const userRecord = await adminAuth.getUserByEmail(email);
        targetUid = userRecord.uid;
      } catch (error) {
        return NextResponse.json(
          { error: "User not found with that email" },
          { status: 404 }
        );
      }
    }

    // Set custom claims to make user admin
    await adminAuth.setCustomUserClaims(targetUid, { admin: true });

    // Also update the user document for consistency
    await adminDb.collection("users").doc(targetUid).update({
      admin: true,
      updatedAt: new Date(),
    });

    console.log(`✅ User ${targetUid} is now an admin`);

    return NextResponse.json({
      success: true,
      message: `User ${targetUid} is now an admin`,
      uid: targetUid,
    });
  } catch (error) {
    console.error("Error making user admin:", error);
    return NextResponse.json(
      { error: "Failed to make user admin: " + error.message },
      { status: 500 }
    );
  }
}

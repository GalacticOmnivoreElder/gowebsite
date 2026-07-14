import { NextResponse } from "next/server";
import { getTokenFromRequest, verifyToken } from "@/lib/auth-utils";
import { adminDb } from "@/lib/firebase-admin";
import { createPolarCustomerSession, getPolarPortalBase } from "@/lib/polar";

export async function POST(request) {
  try {
    const token = getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const decodedToken = await verifyToken(token);

    // Get user document
    const userDoc = await adminDb
      .collection("users")
      .doc(decodedToken.uid)
      .get();

    if (!userDoc.exists) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const userData = userDoc.data();

    if (!userData.polarCustomerId) {
      return NextResponse.json(
        { error: "No customer ID found" },
        { status: 400 }
      );
    }

    const customerSession = await createPolarCustomerSession(userData.polarCustomerId);

    const portalUrl = `${getPolarPortalBase()}?customer_session_token=${encodeURIComponent(
      customerSession.token
    )}&id=${encodeURIComponent(userData.polarCustomerId)}`;

    return NextResponse.json({
      success: true,
      portal_url: portalUrl,
      message: "Redirecting to your customer portal",
    });
  } catch (error) {
    console.error("❌ Error creating portal access:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create portal access" },
      { status: 500 }
    );
  }
}

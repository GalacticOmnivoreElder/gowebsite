import { NextResponse } from "next/server";
import { getTokenFromRequest, verifyToken } from "@/lib/auth-utils";
import { adminDb } from "@/lib/firebase-admin";

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

    console.log(
      "🔄 Creating customer session for customer:",
      userData.polarCustomerId
    );

    // Create customer session using the correct API
    const customerSessionResponse = await fetch(
      "https://api.polar.sh/v1/customer-sessions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.POLAR_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customer_id: userData.polarCustomerId,
        }),
      }
    );

    if (!customerSessionResponse.ok) {
      const errorText = await customerSessionResponse.text();
      console.error("❌ Failed to create customer session:", errorText);
      throw new Error(`Failed to create customer session: ${errorText}`);
    }

    const customerSession = await customerSessionResponse.json();
    console.log("✅ Customer session created successfully");

    // Build the proper sandbox portal URL with customer session token
    const portalUrl = `https://sandbox.polar.sh/yoga-platform-sandbox/portal/overview?customer_session_token=${customerSession.token}&id=${userData.polarCustomerId}`;

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

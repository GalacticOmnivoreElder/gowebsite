import { NextResponse } from "next/server";
import { getTokenFromRequest, verifyToken } from "@/lib/auth-utils";
import { adminDb } from "@/lib/firebase-admin";

export async function GET(request) {
  try {
    const token = getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const decodedToken = await verifyToken(token);

    // Get user's orders from Firestore
    const ordersQuery = await adminDb
      .collection("orders")
      .where("userId", "==", decodedToken.uid)
      .orderBy("createdAt", "desc")
      .get();

    const orders = [];
    ordersQuery.forEach((doc) => {
      const data = doc.data();
      orders.push({
        id: doc.id,
        ...data,
        // Convert Firestore timestamps to ISO strings
        createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
        paidAt: data.paidAt?.toDate?.()?.toISOString() || data.paidAt,
      });
    });

    return NextResponse.json({
      orders: orders,
    });
  } catch (error) {
    console.error("Error fetching orders:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

export async function GET(request) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return Response.json({ error: "No token provided" }, { status: 401 });
    }

    const token = authHeader.split("Bearer ")[1];
    const decodedToken = await adminAuth.verifyIdToken(token);
    const uid = decodedToken.uid;

    const userDoc = await adminDb.collection("users").doc(uid).get();
    const userData = userDoc.data();

    if (!userData || !userData.unlockedPackages) {
      return Response.json([]);
    }

    const packagesRef = adminDb.collection("packages");
    const snapshot = await packagesRef
      .where("id", "in", userData.unlockedPackages)
      .get();

    const packages = [];
    snapshot.forEach((doc) => {
      packages.push({ id: doc.id, ...doc.data() });
    });

    return Response.json(packages);
  } catch (error) {
    console.error("Error fetching user packages:", error);
    return Response.json(
      { error: "Failed to fetch packages" },
      { status: 500 }
    );
  }
}

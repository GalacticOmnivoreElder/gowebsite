export const dynamic = "force-dynamic";

import { adminDb } from "@/lib/firebase-admin";
import { getRequestUser } from "@/lib/auth-utils";

export async function GET(request) {
  try {
    const user = await getRequestUser(request);
    if (!user) {
      return Response.json({ error: "No token provided" }, { status: 401 });
    }

    const userData = user.userData || {};

    const packagesRef = adminDb.collection("packages");
    const snapshot = user.activeMember
      ? await packagesRef.get()
      : Array.isArray(userData.unlockedPackages) && userData.unlockedPackages.length > 0
      ? await packagesRef.where("id", "in", userData.unlockedPackages).get()
      : null;

    if (!snapshot) {
      return Response.json([]);
    }

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

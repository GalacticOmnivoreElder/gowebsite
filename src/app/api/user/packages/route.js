export const dynamic = "force-dynamic";

import { adminDb } from "@/lib/firebase-admin";
import { getRequestUser } from "@/lib/auth-utils";
import { isPublicResourceStatus, toPublicResourceDto } from "@/lib/content-visibility";

export async function GET(request) {
  try {
    const user = await getRequestUser(request);
    if (!user) {
      return Response.json({ error: "No token provided" }, { status: 401 });
    }

    const userData = user.userData || {};

    const packagesRef = adminDb.collection("packages");
    const snapshot = await packagesRef.get();

    if (!snapshot) {
      return Response.json([]);
    }

    const packages = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      const isEntitled =
        user.admin || user.activeMember || userData.unlockedPackages?.includes(doc.id);
      if (isEntitled && (user.admin || isPublicResourceStatus(data.status))) {
        packages.push(toPublicResourceDto({ id: doc.id, ...data }));
      }
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

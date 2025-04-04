import { adminDb } from "@/lib/firebase-admin";

export async function GET(request, { params }) {
  try {
    const { slug } = params;

    // Get the package
    const packageQuery = await adminDb
      .collection("packages")
      .where("slug", "==", slug)
      .limit(1)
      .get();

    if (packageQuery.empty) {
      return Response.json({ error: "Package not found" }, { status: 404 });
    }

    const packageDoc = packageQuery.docs[0];
    const packageData = { id: packageDoc.id, ...packageDoc.data() };

    // Check if user is authenticated
    const authHeader = request.headers.get("authorization");
    let isAuthenticated = false;
    let hasAccess = false;
    let uid = null;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      try {
        const token = authHeader.split("Bearer ")[1];
        const { adminAuth } = await import("@/lib/firebase-admin");
        const decodedToken = await adminAuth.verifyIdToken(token);
        uid = decodedToken.uid;
        isAuthenticated = true;

        // Get user data
        const userDoc = await adminDb.collection("users").doc(uid).get();
        const userData = userDoc.data();

        // Check if user has access to this package
        hasAccess = userData?.unlockedPackages?.includes(packageData.id);

        console.log("Access check:", {
          uid,
          packageId: packageData.id,
          unlockedPackages: userData?.unlockedPackages,
          hasAccess,
        });
      } catch (error) {
        console.error("Auth verification error:", error);
        // Continue as unauthenticated user
      }
    }

    // Prepare response based on access level
    const responseData = {
      ...packageData,
      isAuthenticated,
      hasAccess,
    };

    // If user doesn't have access, remove download URLs from assets
    if (!hasAccess) {
      responseData.assets = packageData.assets.map((asset) => ({
        ...asset,
        downloadUrl: undefined, // Remove download URL
      }));
    }

    return Response.json(responseData);
  } catch (error) {
    console.error("Error fetching package:", error);
    return Response.json({ error: "Failed to fetch package" }, { status: 500 });
  }
}

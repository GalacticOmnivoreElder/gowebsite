import { adminDb } from "@/lib/firebase-admin";
import { getEffectiveMembership, getRequestUser } from "@/lib/auth-utils";

export async function GET(request, { params }) {
  try {
    const { slug } = await params;

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

    const user = await getRequestUser(request);
    if (packageData.status === "draft" && user?.admin !== true) {
      // Do not reveal whether a private draft slug exists.
      return Response.json({ error: "Package not found" }, { status: 404 });
    }
    const isAuthenticated = !!user;
    const membership = getEffectiveMembership(user?.userData || {}, {
      admin: user?.admin === true,
    });
    const hasPackageUnlock = user?.userData?.unlockedPackages?.includes(packageData.id) === true;
    const hasAccess = membership.activeMember || hasPackageUnlock;

    // Prepare response based on access level
    const responseData = {
      ...packageData,
      isAuthenticated,
      hasAccess,
    };

    // If user doesn't have access, remove download URLs from assets
    if (!hasAccess) {
      responseData.assets = (packageData.assets || []).map((asset) => ({
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

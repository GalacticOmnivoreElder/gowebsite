import { adminDb } from "@/lib/firebase-admin";
import { getRequestUser } from "@/lib/auth-utils";
import { hasResourceAccess } from "@/lib/content-entitlements";
import { isPublicResourceStatus, toPublicResourceDto } from "@/lib/content-visibility";

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
    if (!isPublicResourceStatus(packageData.status) && user?.admin !== true) {
      // Do not reveal whether a private draft slug exists.
      return Response.json({ error: "Package not found" }, { status: 404 });
    }
    const isAuthenticated = !!user;
    const hasAccess = hasResourceAccess(packageData.id, user?.userData || {}, {
      admin: user?.admin === true,
    });

    // Prepare response based on access level
    const responseData = {
      ...toPublicResourceDto(packageData),
      isAuthenticated,
      hasAccess,
    };

    return Response.json(responseData);
  } catch (error) {
    console.error("Error fetching package:", error);
    return Response.json({ error: "Failed to fetch package" }, { status: 500 });
  }
}

import { adminDb } from "@/lib/firebase-admin";
import { isPublicResourceStatus, toPublicResourceDto } from "@/lib/content-visibility";

export async function GET() {
  try {
    const packagesSnapshot = await adminDb.collection("packages").get();

    const packages = packagesSnapshot.docs
      .filter((doc) => isPublicResourceStatus(doc.data().status))
      .map((doc) => toPublicResourceDto({ id: doc.id, ...doc.data() }));

    return Response.json(packages);
  } catch (error) {
    console.error("Error fetching packages:", error);
    return Response.json(
      { error: "Failed to fetch packages" },
      { status: 500 }
    );
  }
}

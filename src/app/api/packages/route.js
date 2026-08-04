import { adminDb } from "@/lib/firebase-admin";
import { isPublicResourceStatus, toPublicResourceDto } from "@/lib/content-visibility";

export async function GET() {
  try {
    const packagesRef = adminDb.collection("packages");
    const snapshot = await packagesRef.get();

    const packages = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      if (isPublicResourceStatus(data.status)) {
        packages.push(toPublicResourceDto({ id: doc.id, ...data }));
      }
    });

    return Response.json(packages);
  } catch (error) {
    console.error("Error fetching packages:", error);
    return Response.json(
      { error: "Failed to fetch packages" },
      { status: 500 }
    );
  }
}

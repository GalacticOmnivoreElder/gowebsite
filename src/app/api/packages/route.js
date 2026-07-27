import { adminDb } from "@/lib/firebase-admin";

export async function GET() {
  try {
    const packagesRef = adminDb.collection("packages");
    const snapshot = await packagesRef.get();

    const packages = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      // Packages created before publication states were introduced are public
      // for backwards compatibility. New drafts must never leave this route.
      if (data.status !== "draft") {
        packages.push({ id: doc.id, ...data });
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

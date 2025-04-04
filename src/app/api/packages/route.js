import { adminDb } from "@/lib/firebase-admin";

export async function GET() {
  try {
    const packagesRef = adminDb.collection("packages");
    const snapshot = await packagesRef.get();

    const packages = [];
    snapshot.forEach((doc) => {
      packages.push({ id: doc.id, ...doc.data() });
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

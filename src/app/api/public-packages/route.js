import { adminDb } from "@/lib/firebase-admin";

export async function GET() {
  try {
    const packagesSnapshot = await adminDb.collection("packages").get();

    const packages = packagesSnapshot.docs.map((doc) => {
      const data = doc.data();
      // Sanitize the package data to remove sensitive information
      const assets =
        data.assets?.map((asset) => ({
          title: asset.title,
          description: asset.description,
          type: asset.type,
          image: asset.image,
          // Deliberately omitting downloadUrl
        })) || [];

      return {
        id: doc.id,
        title: data.title,
        description: data.description,
        theme: data.theme,
        month: data.month,
        year: data.year,
        coverImage: data.coverImage,
        slug: data.slug,
        assets,
      };
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

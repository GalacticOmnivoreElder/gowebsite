import { adminDb } from "@/lib/firebase-admin";

export async function GET() {
  try {
    const snapshot = await adminDb.collection("community_timeline").where("published", "==", true).get();
    const entries = snapshot.docs.map((doc) => {
      const { title, description, date, category, state, organization, relationship, project, image, imageAlt, link, source } = doc.data();
      return { id: doc.id, title, description, date, category, state, organization, relationship, project, image, imageAlt, link, source };
    }).sort((a, b) => a.date.localeCompare(b.date));
    return Response.json({ entries });
  } catch {
    return Response.json({ error: "The timeline is temporarily unavailable." }, { status: 503 });
  }
}

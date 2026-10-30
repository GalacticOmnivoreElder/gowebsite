import { adminDb } from "@/lib/firebase-admin";

export async function GET() {
  try {
    const doc = await adminDb.collection("community_hunger").doc("current").get();
    if (!doc.exists) return Response.json({ hunger: null });
    const { capacity, commitments, interest, explanation, reviewedOn } = doc.data();
    return Response.json({ hunger: { capacity, commitments, interest, explanation, reviewedOn } });
  } catch { return Response.json({ error: "Hunger information is temporarily unavailable." }, { status: 503 }); }
}

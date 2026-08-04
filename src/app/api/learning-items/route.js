import { adminDb } from "@/lib/firebase-admin";
import { canListLearningItem, toPublicLearningItemDto } from "@/lib/learning-items";

export async function GET() {
  const snapshot = await adminDb.collection("learning_items").get();
  const items = snapshot.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }))
    .filter(canListLearningItem)
    .map(toPublicLearningItemDto)
    .sort((left, right) => String(left.startsAt || "9999").localeCompare(String(right.startsAt || "9999")));
  return Response.json(items, { headers: { "Cache-Control": "public, max-age=60, s-maxage=300" } });
}

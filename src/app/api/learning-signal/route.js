import { getRequestUser } from "@/lib/auth-utils";
import { adminDb } from "@/lib/firebase-admin";
import { applyLearningEvent, createLearningSignalHandlers, learningSummary } from "@/lib/omnivore-progress.mjs";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const handlers = createLearningSignalHandlers({
  authenticate: getRequestUser,
  read: async uid => {
    const snapshot = await adminDb.collection("omnivore_progress").doc(uid).get();
    return learningSummary(snapshot.data());
  },
  record: async (uid, event) => {
    const ref = adminDb.collection("omnivore_progress").doc(uid);
    return adminDb.runTransaction(async transaction => {
      const snapshot = await transaction.get(ref);
      const result = applyLearningEvent(snapshot.data(), event);
      if (result.xpAwarded) transaction.set(ref, result.data);
      return { summary: result.summary, xpAwarded: result.xpAwarded };
    });
  },
});

export const GET = handlers.GET;
export const POST = handlers.POST;

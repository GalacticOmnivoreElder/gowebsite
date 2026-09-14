import { getRequestUser } from "@/lib/auth-utils";
import { adminDb } from "@/lib/firebase-admin";
import { starterPassportRecord } from '@/lib/starter-passport.mjs';
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
      const cvRef = adminDb.collection('go_cvs').doc(uid);
      const cv = event.eventType === 'lesson_complete' && result.xpAwarded ? await transaction.get(cvRef) : null;
      if (result.xpAwarded || result.changed) {
        transaction.set(ref, result.data);
        if (event.eventType === 'lesson_complete') {
          // Merge only the earned record. Existing Passport publication and
          // visibility fields remain authoritative, including for new drafts.
          transaction.set(cvRef, {
            ...(!cv?.exists ? { status: 'draft', title: 'GameDev Passport', sections: [], visibility_public: false, visibility_project_creators: false } : {}),
            user_id: uid, starterPathway: starterPassportRecord(result.data),
          }, { merge: true });
        }
      }
      return { summary: result.summary, xpAwarded: result.xpAwarded };
    });
  },
});

export const GET = handlers.GET;
export const POST = handlers.POST;

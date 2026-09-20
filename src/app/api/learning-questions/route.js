import { createHash, randomBytes } from 'node:crypto';
import { adminDb as db } from '@/lib/firebase-admin';
import { getRequestUser } from '@/lib/auth-utils';
import { cleanLearningQuestion, publicLearningAnswer, rankLearningAnswers } from '@/lib/learning-questions';
import { isExpiredWorkspace } from '@/lib/go-policy';

export const dynamic = 'force-dynamic';
export async function GET(request) {
  try {
    const params = new URL(request.url).searchParams;
    const user = await getRequestUser(request);
    if (params.get('review') === 'true') {
      if (!user?.admin) return Response.json({ error: 'GO staff access required.' }, { status: 403 });
      const snapshot = await db.collection('learning_questions').orderBy('createdAt', 'desc').limit(100).get();
      return Response.json({ questions: snapshot.docs.map(d => { const { receiptHash, ...data } = d.data(); return { id: d.id, ...data }; }) }, { headers: { 'Cache-Control': 'private, no-store' } });
    }
    const snapshot = await db.collection('learning_questions').where('status', '==', 'published').limit(300).get();
    return Response.json({ answers: rankLearningAnswers(snapshot.docs.map(d => publicLearningAnswer(d.id, d.data())), params.get('q')) }, { headers: { 'Cache-Control': 'no-store' } });
  } catch { return Response.json({ error: 'GO answers are temporarily unavailable.' }, { status: 503 }); }
}

export async function POST(request) {
  try {
    const user = await getRequestUser(request);
    const raw = await request.text();
    if (raw.length > 16000) return Response.json({ error: 'This submission is too large.' }, { status: 413 });
    const body = JSON.parse(raw);
    if (body.action === 'review') {
      if (!user?.admin) return Response.json({ error: 'GO staff access required.' }, { status: 403 });
      if (!/^[A-Za-z0-9_-]{1,128}$/.test(body.id || '') || !['published', 'pending', 'closed'].includes(body.status)) return Response.json({ error: 'Invalid review.' }, { status: 400 });
      const answer = String(body.answer || '').trim();
      const publicQuestion = String(body.publicQuestion || '').trim();
      if (body.status === 'published' && (answer.length < 20 || publicQuestion.length < 12)) return Response.json({ error: 'Add a complete public question and answer before publishing.' }, { status: 400 });
      if (answer.length > 20000 || publicQuestion.length > 2000) return Response.json({ error: 'The answer is too long.' }, { status: 400 });
      await db.runTransaction(async tx => {
        const ref = db.collection('learning_questions').doc(body.id);
        const doc = await tx.get(ref);
        if (!doc.exists) throw Object.assign(new Error('Question not found.'), { status: 404 });
        const original = doc.data();
        tx.update(ref, { answer, publicQuestion, status: body.status, reviewedBy: user.uid, updatedAt: new Date() });
        if (body.status === 'published' && original.status !== 'published' && original.userId) {
          tx.set(db.collection('product_notifications').doc(`learning-answer-${doc.id}`), { recipientUserId: original.userId, type: 'course_update', title: 'GO answered your question', message: publicQuestion.slice(0, 300), actionUrl: `/learn/answers/${doc.id}`, readAt: null, createdAt: new Date() });
        }
        tx.create(db.collection('admin_audit_events').doc(), { action: 'learning_question.reviewed', actorId: user.uid, questionId: doc.id, status: body.status, createdAt: new Date() });
      });
      return Response.json({ saved: true });
    }
    if (user && !user.admin && isExpiredWorkspace(user.userData, user.activeMember)) return Response.json({ error: 'Your workspace is frozen. Contact GO for help or renew to submit a question.' }, { status: 403 });
    const question = cleanLearningQuestion(body);
    // Hash the host-provided IP; never store raw addresses in the question record.
    const identity = user?.uid || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'anonymous';
    const bucket = createHash('sha256').update(`go-question:${identity}:${new Date().toISOString().slice(0, 10)}`).digest('hex');
    const receipt = randomBytes(24).toString('hex');
    const ref = db.collection('learning_questions').doc();
    await db.runTransaction(async tx => {
      const rateRef = db.collection('learning_question_limits').doc(bucket);
      const rate = await tx.get(rateRef);
      if ((rate.data()?.count || 0) >= 5) throw Object.assign(new Error('You have reached today’s question limit. Please try again tomorrow.'), { status: 429 });
      tx.set(rateRef, { count: (rate.data()?.count || 0) + 1, updatedAt: new Date() });
      tx.create(ref, { question, userId: user?.uid || null, publicAttribution: user ? 'GO member' : 'Anonymous', publishConsent: true,
        status: 'pending', receiptHash: createHash('sha256').update(receipt).digest('hex'), createdAt: new Date(), updatedAt: new Date() });
    });
    return Response.json({ id: ref.id, receipt, message: user ? 'GO received your question. We will notify you here when an answer is published.' : 'GO received your question as Anonymous. Keep this receipt and check the public answers for updates.' }, { status: 201 });
  } catch (error) { return Response.json({ error: error.status ? error.message : 'The question could not be saved. Please try again.' }, { status: error.status || 500 }); }
}

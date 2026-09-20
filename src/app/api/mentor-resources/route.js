import { adminDb as db } from '@/lib/firebase-admin';
import { getRequestUser } from '@/lib/auth-utils';
import { hasMentorToolAccess } from '@/lib/content-entitlements';

export const dynamic = 'force-dynamic';
export async function GET(request) {
  try {
    const user = await getRequestUser(request);
    if (!user) return Response.json({ error: 'Sign in to open the learning workspace.' }, { status: 401 });
    const review = new URL(request.url).searchParams.get('review') === 'true';
    if (review && !user.admin) return Response.json({ error: 'GO staff access required.' }, { status: 403 });
    const snapshot = review ? await db.collection('mentor_learning_resources').limit(200).get() : await db.collection('mentor_learning_resources').where('authorId', '==', user.uid).limit(100).get();
    return Response.json({ canCreate: hasMentorToolAccess(user.userData, { admin: user.admin }), resources: snapshot.docs.map(d => ({ id: d.id, ...d.data() })) }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch { return Response.json({ error: 'Resources are temporarily unavailable.' }, { status: 503 }); }
}

export async function POST(request) {
  try {
    const user = await getRequestUser(request);
    if (!user) return Response.json({ error: 'Sign in to continue.' }, { status: 401 });
    const body = await request.json();
    if (body.id && !/^[A-Za-z0-9_-]{1,128}$/.test(body.id)) return Response.json({ error: 'Invalid resource.' }, { status: 400 });
    const ref = body.id ? db.collection('mentor_learning_resources').doc(body.id) : db.collection('mentor_learning_resources').doc();
    if (body.action === 'review') {
      if (!user.admin) return Response.json({ error: 'GO staff access required.' }, { status: 403 });
      if (!body.id || !['published', 'changes_requested', 'archived'].includes(body.status)) return Response.json({ error: 'Choose a review outcome.' }, { status: 400 });
      await db.runTransaction(async tx => {
        const doc = await tx.get(ref);
        if (!doc.exists) throw Object.assign(new Error('Resource not found.'), { status: 404 });
        tx.update(ref, { status: body.status, reviewNote: String(body.reviewNote || '').slice(0, 2000), reviewedBy: user.uid, updatedAt: new Date(), ...(body.status === 'published' ? { publishedAt: new Date() } : {}) });
        tx.create(db.collection('admin_audit_events').doc(), { action: 'mentor_resource.reviewed', actorId: user.uid, resourceId: ref.id, status: body.status, createdAt: new Date() });
      });
    } else {
      if (!hasMentorToolAccess(user.userData, { admin: user.admin })) return Response.json({ error: 'GO approval and active Mentor access are required. Business members need the mentor earning add-on.' }, { status: 403 });
      const title = String(body.title || '').trim();
      const content = String(body.content || '').trim();
      const materialUrl = String(body.materialUrl || '').trim();
      if (title.length < 5 || title.length > 160 || content.length < 30 || content.length > 20000 || !['course', 'workshop', 'video_bundle', 'asset', 'guide'].includes(body.kind)) return Response.json({ error: 'Add a title, resource type, and learning material (30–20,000 characters).' }, { status: 400 });
      if (materialUrl && (!/^https:\/\//i.test(materialUrl) || materialUrl.length > 2000)) return Response.json({ error: 'Material links must use HTTPS.' }, { status: 400 });
      await db.runTransaction(async tx => {
        const doc = await tx.get(ref);
        if (doc.exists && doc.data().authorId !== user.uid && !user.admin) throw Object.assign(new Error('This is another creator’s resource.'), { status: 403 });
        // Published content cannot be silently replaced; staff review every change.
        tx.set(ref, { title, content, materialUrl, kind: body.kind, authorId: doc.data()?.authorId || user.uid, status: body.submit ? 'submitted' : 'draft', mentorSharePercent: 90, salesEnabled: false, createdAt: doc.data()?.createdAt || new Date(), updatedAt: new Date() }, { merge: true });
      });
    }
    return Response.json({ saved: true, id: ref.id });
  } catch (error) { return Response.json({ error: error.status ? error.message : 'The resource could not be saved.' }, { status: error.status || 500 }); }
}

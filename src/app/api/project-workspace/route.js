import { adminDb as db } from '@/lib/firebase-admin';
import { getRequestUser } from '@/lib/auth-utils';
import { readProjectCapacity } from '@/lib/project-capacity';
import { isExpiredWorkspace, isGoReleased } from '@/lib/go-policy';

export const dynamic = 'force-dynamic';
export async function GET(request) {
  const user = await getRequestUser(request);
  if (!user) return Response.json({ error: 'Sign in to continue.' }, { status: 401 });
  if (user.admin && new URL(request.url).searchParams.get('review') === 'true') {
    const snapshot = await db.collection('projects').get();
    return Response.json({ projects: snapshot.docs.filter(d => d.data().releaseApproval?.status === 'requested' || d.data().publishingRequest?.status === 'requested').map(d => ({ id: d.id, title: d.data().title, owner: d.data().owner, releaseApproval: d.data().releaseApproval || null, publishingRequest: d.data().publishingRequest || null })) }, { headers: { 'Cache-Control': 'private, no-store' } });
  }
  return Response.json(await readProjectCapacity(user), { headers: { 'Cache-Control': 'private, no-store' } });
}

export async function POST(request) {
  try {
    const user = await getRequestUser(request);
    if (!user) return Response.json({ error: 'Sign in to continue.' }, { status: 401 });
    const body = await request.json();
    const action = body.action;
    if (['set_capacity', 'set_mentor_addon'].includes(action)) {
      if (!user.admin) return Response.json({ error: 'GO staff access required.' }, { status: 403 });
      if (typeof body.userId !== 'string' || !body.userId || body.userId.includes('/')) return Response.json({ error: 'A valid account ID is required.' }, { status: 400 });
      if (typeof body.reason !== 'string' || body.reason.trim().length < 8) return Response.json({ error: 'Record the negotiated agreement or verified payment reference.' }, { status: 400 });
      let update;
      if (action === 'set_capacity') {
        if (!Number.isInteger(body.limit) || body.limit < 0 || body.limit > 10000) return Response.json({ error: 'Capacity must be a whole number from 0 to 10,000.' }, { status: 400 });
        update = { businessProjectLimit: body.limit };
      } else {
        const end = new Date(body.endsAt);
        if (!['active', 'inactive'].includes(body.status) || (body.status === 'active' && (!Number.isFinite(end.getTime()) || end <= new Date()))) return Response.json({ error: 'Active add-on access needs a future paid-through date.' }, { status: 400 });
        update = { mentorAddonStatus: body.status, mentorAddonEndsAt: body.status === 'active' ? end : null };
      }
      await db.runTransaction(async tx => {
        const ref = db.collection('users').doc(body.userId);
        const old = await tx.get(ref);
        if (!old.exists) throw Object.assign(new Error('Account not found.'), { status: 404 });
        tx.update(ref, update);
        tx.create(db.collection('admin_audit_events').doc(), { action, actorId: user.uid, targetUserId: body.userId, reason: body.reason.trim(), update, createdAt: new Date() });
      });
      return Response.json({ saved: true });
    }
    if (!['request_release', 'approve_release', 'request_publishing', 'review_publishing'].includes(action) || typeof body.projectId !== 'string' || !body.projectId || body.projectId.includes('/')) return Response.json({ error: 'Choose a valid project action.' }, { status: 400 });
    await db.runTransaction(async tx => {
      const ref = db.collection('projects').doc(body.projectId);
      const doc = await tx.get(ref);
      if (!doc.exists) throw Object.assign(new Error('Project not found.'), { status: 404 });
      const project = doc.data();
      const ledgerRef = db.collection('project_capacity').doc(project.owner);
      const ledger = await tx.get(ledgerRef);
      if (action.startsWith('request_')) {
        if (project.owner !== user.uid && !user.admin) throw Object.assign(new Error('Only the project owner can request review.'), { status: 403 });
        if (!user.admin && (!user.activeMember || isExpiredWorkspace(user.userData, user.activeMember))) throw Object.assign(new Error('An active membership is required to request review.'), { status: 403 });
        if (isGoReleased(project)) throw Object.assign(new Error('GO has already approved this release.'), { status: 409 });
        const url = String(body.evidenceUrl || '').trim();
        if (!/^https:\/\//i.test(url) || url.length > 2000) throw Object.assign(new Error('Add an HTTPS link to your playable build or release materials.'), { status: 400 });
        const field = action === 'request_release' ? 'releaseApproval' : 'publishingRequest';
        tx.update(ref, { [field]: { status: 'requested', requestedAt: new Date(), requestedBy: user.uid, evidenceUrl: url, note: String(body.note || '').slice(0, 3000) } });
      } else {
        if (!user.admin) throw Object.assign(new Error('Only GO staff can approve a release or review publishing.'), { status: 403 });
        if (typeof body.note !== 'string' || body.note.trim().length < 8) throw Object.assign(new Error('Record the review outcome and release evidence.'), { status: 400 });
        if (action === 'approve_release') {
          tx.update(ref, { status: 'completed', releaseApproval: { ...(project.releaseApproval || {}), status: 'approved', reviewedBy: user.uid, reviewedAt: new Date(), reviewNote: body.note.slice(0, 3000) } });
          tx.set(ledgerRef, { occupied: (ledger.data()?.occupied || []).filter(id => id !== doc.id), updatedAt: new Date() }, { merge: true });
        } else {
          tx.update(ref, { publishingRequest: { ...(project.publishingRequest || {}), status: 'reviewed', reviewedBy: user.uid, reviewedAt: new Date(), reviewNote: body.note.slice(0, 3000) } });
        }
      }
      tx.create(db.collection('admin_audit_events').doc(), { action, actorId: user.uid, projectId: doc.id, createdAt: new Date() });
    });
    return Response.json({ saved: true });
  } catch (error) { return Response.json({ error: error.status ? error.message : 'The project action could not be saved.' }, { status: error.status || 500 }); }
}

import { adminDb } from '@/lib/firebase-admin';
import { getEffectiveMembership } from '@/lib/auth-utils';
import { projectAllowance, isGoReleased } from '@/lib/go-policy';

export async function readProjectCapacity(user, db = adminDb) {
  const data = user.userData || {};
  const allowance = projectAllowance(data, user.activeMember, user.admin);
  const [owned, ledger] = await Promise.all([
    db.collection('projects').where('owner', '==', user.uid).get(),
    db.collection('project_capacity').doc(user.uid).get(),
  ]);
  // Ledger keeps deleted/archived unfinished projects from freeing a slot.
  const occupied = new Set(ledger.data()?.occupied || []);
  for (const doc of owned.docs) {
    if (isGoReleased(doc.data())) occupied.delete(doc.id);
    else occupied.add(doc.id);
  }
  return { ...allowance, used: occupied.size, canCreate: allowance.limit === null || occupied.size < allowance.limit,
    projects: owned.docs.map(doc => ({ id: doc.id, title: doc.data().title, status: doc.data().status, releaseApproval: doc.data().releaseApproval || null, publishingRequest: doc.data().publishingRequest || null })) };
}

// Serialize creations on an owner ledger; read current billing and legacy projects in
// the same transaction. The caller queues its project/source/idempotency writes here.
export async function commitProjectCreation({ user, projectId, creationRequestRef, writes, intent = 'creator', db = adminDb }) {
  return db.runTransaction(async transaction => {
    const userRef = db.collection('users').doc(user.uid);
    const ledgerRef = db.collection('project_capacity').doc(user.uid);
    const [profile, ledger, replay, owned] = await Promise.all([
      transaction.get(userRef), transaction.get(ledgerRef), transaction.get(creationRequestRef),
      transaction.get(db.collection('projects').where('owner', '==', user.uid)),
    ]);
    if (replay.exists) return { replayed: true };
    const data = profile.data() || {};
    const membership = getEffectiveMembership(data, { admin: user.admin });
    const allowance = projectAllowance(data, membership.activeMember, user.admin);
    if (intent === 'hire-talent' && !user.admin && membership.membershipTier !== 'company') {
      throw Object.assign(new Error('GO Business is required for hiring briefs. You can use your included creator project for your own game.'), { status: 403, code: 'business_required' });
    }
    const occupied = new Set(ledger.data()?.occupied || []);
    for (const doc of owned.docs) {
      if (isGoReleased(doc.data())) occupied.delete(doc.id);
      else occupied.add(doc.id);
    }
    if (allowance.limit !== null && occupied.size >= allowance.limit) {
      throw Object.assign(new Error(allowance.reason === 'business_capacity_required' ? 'Contact GO to agree your Business project capacity.' : allowance.reason === 'membership_required' ? 'An active membership is required.' : 'Your project allowance is in use. GO must approve a release before you can start another project.'), { status: 403, code: allowance.reason || 'project_capacity_reached' });
    }
    occupied.add(projectId);
    transaction.set(ledgerRef, { occupied: [...occupied], updatedAt: new Date() });
    for (const [method, ...args] of writes) transaction[method](...args);
    return { replayed: false };
  });
}

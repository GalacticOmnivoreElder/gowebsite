import { getRequestUser } from '@/lib/auth-utils';
import { reconcileWhopUser } from '@/lib/whop';
import { adminDb } from '@/lib/firebase-admin';

export async function POST(request) {
  const user = await getRequestUser(request);
  if (!user) return Response.json({ error: 'Authentication required' }, { status: 401 });
  const ref = adminDb.collection('whop_recovery_limits').doc(user.uid);
  const allowed = await adminDb.runTransaction(async tx => {
    const previous = (await tx.get(ref)).data()?.at?.toMillis?.() || 0;
    if (Date.now() - previous < 60000) return false;
    tx.set(ref, { at: new Date() });
    return true;
  });
  if (!allowed) return Response.json({ error: 'Please wait a minute before checking again.' }, { status: 429 });
  try {
    const result = await reconcileWhopUser(user.uid);
    return Response.json({ confirmed: Boolean(result.record?.activeMember), pending: Boolean(result.pending) });
  } catch (error) {
    console.error('whop_recovery_failed', { code: error.code || 'sync_failed' });
    return Response.json({ error: 'Confirmation is still pending. Try again or contact GO support.' }, { status: 503 });
  }
}

import { adminDb } from '@/lib/firebase-admin';
import { whopRequest, syncWhopMembership } from '@/lib/whop';
import { whopConfig } from '@/lib/whop-model.mjs';

export const runtime = 'nodejs';
export const maxDuration = 60;
export async function POST(request) {
  if (!process.env.CRON_SECRET || request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const config = whopConfig();
    const ref = adminDb.collection('whop_reconciliation').doc(`${config.environment}_${config.accountId}`);
    const saved = (await ref.get()).data();
    const query = new URLSearchParams({ account_id: config.accountId, first: '2', ...(saved?.cursor ? { after: saved.cursor } : {}) });
    const page = await whopRequest(`/memberships?${query}`, { config });
    for (const membership of page.data) await syncWhopMembership(membership.id, config);
    await ref.set({ cursor: page.page_info.has_next_page ? page.page_info.end_cursor : null,
      lastRunAt: new Date(), lastCycleCompletedAt: page.page_info.has_next_page ? saved?.lastCycleCompletedAt || null : new Date() });
    return Response.json({ checked: page.data.length, cycleComplete: !page.page_info.has_next_page });
  } catch (error) {
    console.error('whop_reconciliation_failed', { code: error.code || 'sync_failed' });
    return Response.json({ error: 'Reconciliation failed; the cursor was retained for retry.' }, { status: 503 });
  }
}
export const GET = POST;

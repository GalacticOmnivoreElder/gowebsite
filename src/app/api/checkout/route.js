import { getRequestUser } from '@/lib/auth-utils';
import { getProductConfig } from '@/lib/product-config';
import { createWhopCheckout } from '@/lib/whop';

export const runtime = 'nodejs';
export async function POST(request) {
  const user = await getRequestUser(request);
  if (!user || user.claims?.firebase?.sign_in_provider === 'anonymous') return Response.json({ error: 'Sign in with Google or email before checkout.' }, { status: 401 });
  const config = getProductConfig();
  if (!config.membershipCheckoutEnabled) return Response.json({ error: 'New membership checkout is temporarily unavailable. Existing members can manage their subscription in Billing.', code: 'membership_checkout_unavailable' }, { status: 503 });
  const body = await request.json().catch(() => ({}));
  if (!['member', 'mentor', 'company'].includes(body.tier) || !['monthly', 'annual'].includes(body.interval)) return Response.json({ error: 'Choose a valid membership and billing interval.' }, { status: 400 });
  if (body.tier === 'mentor' && !config.mentorCheckoutEnabled) return Response.json({ error: 'Mentor checkout is temporarily unavailable.' }, { status: 503 });
  try { return Response.json(await createWhopCheckout(user, body.tier, body.interval)); }
  catch (error) {
    console.error('whop_checkout_failed', { code: error.code || 'checkout_failed', providerStatus: error.providerStatus, fields: error.fields });
    return Response.json({ code: error.code || 'checkout_failed', error: error.code === 'active_membership'
      ? 'Manage your existing membership in Billing before starting another subscription.'
      : error.code === 'pending_checkout_other_plan'
      ? 'You already have an unfinished checkout for another plan. Contact GO support before changing it.'
      : 'Checkout is temporarily unavailable. Please try again or contact GO support.' }, { status: error.status || 503 });
  }
}

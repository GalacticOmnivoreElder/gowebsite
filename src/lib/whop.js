import 'server-only';
import { randomUUID } from 'node:crypto';
import { adminDb } from '@/lib/firebase-admin';
import { enqueueDiscordSync } from '@/lib/discord';
import { accessDate, resolveMembershipRecord } from '@/lib/membership-access.mjs';
import { WHOP_API_VERSION, whopConfig, configuredPlan, validateWhopVariant,
  trustedWhopUrl, paymentEvidence, deriveWhopMembership, whopError } from '@/lib/whop-model.mjs';

export async function whopRequest(path, { method = 'GET', body, idempotencyKey, config = whopConfig() } = {}) {
  const response = await fetch(`${config.baseUrl}${path}`, {
    method, cache: 'no-store', signal: AbortSignal.timeout(15000),
    headers: { Authorization: `Bearer ${config.token}`, 'Api-Version-Date': WHOP_API_VERSION,
      'Content-Type': 'application/json', ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!response.ok) {
    // Provider bodies may contain secrets or personal data. Never log/return them.
    throw Object.assign(whopError('whop_api_failed'), { providerStatus: response.status });
  }
  return response.status === 204 ? null : response.json();
}

export async function whopList(path, query, config = whopConfig()) {
  const items = [];
  let after;
  for (let page = 0; page < 50; page++) {
    const params = new URLSearchParams({ ...query, first: '100', ...(after ? { after } : {}) });
    const result = await whopRequest(`${path}?${params}`, { config });
    if (!Array.isArray(result.data)) throw whopError('whop_response_invalid');
    items.push(...result.data);
    if (!result.page_info?.has_next_page) return items;
    if (!result.page_info.end_cursor || result.page_info.end_cursor === after) throw whopError('whop_pagination_invalid');
    after = result.page_info.end_cursor;
  }
  throw whopError('whop_reconciliation_page_limit');
}

export async function auditWhopPlan(tier, interval, config = whopConfig()) {
  const plan = configuredPlan(config, tier, interval);
  const [variant, product] = await Promise.all([
    whopRequest(`/variants/${plan.variantId}`, { config }), whopRequest(`/products/${plan.productId}`, { config }),
  ]);
  const terms = validateWhopVariant(variant, product, plan, config.accountId);
  return { plan, terms };
}

function scopedId(config, id) { return `${config.environment}_${config.accountId}_${id}`; }
function linkRef(config, id) { return adminDb.collection('whop_memberships').doc(scopedId(config, id)); }

// A fenced lease serializes remote reads and writes for each membership. An old
// worker cannot overwrite a newer reconciliation even if its network call stalls.
async function withLease(key, work) {
  const ref = adminDb.collection('whop_locks').doc(key);
  const token = randomUUID();
  await adminDb.runTransaction(async tx => {
    const snap = await tx.get(ref);
    if (accessDate(snap.data()?.until) > new Date()) throw whopError('whop_sync_busy');
    tx.set(ref, { token, until: new Date(Date.now() + 180000) });
  });
  try { return await work({ ref, token }); }
  finally {
    await adminDb.runTransaction(async tx => {
      const snap = await tx.get(ref);
      if (snap.data()?.token === token) tx.delete(ref);
    });
  }
}

export async function createWhopCheckout(user, tier, interval) {
  const config = whopConfig();
  const { plan } = await auditWhopPlan(tier, interval, config);
  return withLease(scopedId(config, `checkout_${user.uid}`), async () => {
    const userRef = adminDb.collection('users').doc(user.uid);
    const latest = (await userRef.get()).data() || {};
    // Also block unresolved renewing records: expired local state is not proof
    // that the processor stopped charging an existing subscription.
    if (resolveMembershipRecord(latest).active ||
        (latest.subscriptionId && latest.willRenew !== false && !['revoked', 'refunded', 'unpaid'].includes(latest.subscriptionStatus)) ||
        (latest.whopMembership && !['canceled', 'expired'].includes(latest.whopMembership.status))) {
      throw whopError('active_membership', 409);
    }
    const pendingRef = adminDb.collection('whop_checkout_users').doc(scopedId(config, user.uid));
    let pending = (await pendingRef.get()).data();
    if (pending?.requestId && !pending.checkoutId && (pending.tier !== tier || pending.interval !== interval)) {
      // A previous request may have reached Whop before our database write.
      // Recover its idempotent result so it can be closed and audited safely.
      const previousPlan = configuredPlan(config, pending.tier, pending.interval);
      const recovered = await whopRequest('/checkout_configurations', {
        method: 'POST', config, idempotencyKey: pending.requestId,
        body: { account_id: config.accountId, variant_id: previousPlan.variantId,
          redirect_url: `${config.siteUrl}/subscription/success`, mode: 'payment' },
      });
      if (recovered.account_id !== config.accountId || recovered.variant?.id !== previousPlan.variantId || !/^ch_\w+$/.test(recovered.id)) throw whopError('whop_checkout_mismatch');
      const url = trustedWhopUrl(recovered.purchase_url, config.environment);
      const batch = adminDb.batch();
      batch.set(adminDb.collection('whop_checkouts').doc(scopedId(config, recovered.id)), {
        uid: user.uid, checkoutId: recovered.id, productId: previousPlan.productId,
        variantId: previousPlan.variantId, tier: pending.tier, interval: pending.interval,
        environment: config.environment, accountId: config.accountId,
        createdAt: pending.createdAt, consumedMembershipId: null,
      });
      pending = { ...pending, checkoutId: recovered.id, url };
      batch.set(pendingRef, pending);
      await batch.commit();
    }
    if (pending?.checkoutId) {
      if (pending.tier === tier && pending.interval === interval && !pending.closing) {
        return { flow: 'checkout', provider: 'whop', url: trustedWhopUrl(pending.url, config.environment) };
      }
      // Close the old URL before making a replacement. Keep its checkout-to-user
      // mapping permanently so a late webhook can still identify the buyer.
      await pendingRef.set({ closing: true }, { merge: true });
      try { await whopRequest(`/checkout_configurations/${pending.checkoutId}`, { method: 'DELETE', config }); }
      catch (error) { if (error.providerStatus !== 404) throw error; }
      const createdAt = accessDate(pending.createdAt);
      if (!createdAt) throw whopError('whop_checkout_date_missing');
      const payments = await whopList('/payments', {
        account_id: config.accountId,
        created_after: new Date(createdAt.getTime() - 300000).toISOString(),
      }, config);
      const relevant = payments.filter(payment => payment.checkout_configuration_id === pending.checkoutId);
      const paid = relevant.find(payment => payment.status === 'paid');
      if (paid?.membership_id) {
        await syncWhopMembership(paid.membership_id, config);
        throw whopError('active_membership', 409);
      }
      // Unknown, open, pending, or paid states are not evidence of abandonment.
      if (relevant.some(payment => !['void', 'uncollectible'].includes(payment.status))) {
        throw whopError('checkout_payment_pending', 409);
      }
      await pendingRef.delete();
      pending = null;
    }
    // Persist key BEFORE remote creation. A retry after a crash uses the same key.
    if (!pending?.requestId) {
      pending = { requestId: randomUUID(), tier, interval, createdAt: new Date() };
      await pendingRef.set(pending);
    }
    if (pending.tier !== tier || pending.interval !== interval) throw whopError('pending_checkout_recovery', 409);
    const checkout = await whopRequest('/checkout_configurations', {
      method: 'POST', config, idempotencyKey: pending.requestId,
      body: { account_id: config.accountId, variant_id: plan.variantId,
        redirect_url: `${config.siteUrl}/subscription/success`, mode: 'payment' },
    });
    if (checkout.account_id !== config.accountId || checkout.variant?.id !== plan.variantId || !/^ch_\w+$/.test(checkout.id)) throw whopError('whop_checkout_mismatch');
    const url = trustedWhopUrl(checkout.purchase_url, config.environment);
    const record = { uid: user.uid, checkoutId: checkout.id, productId: plan.productId,
      variantId: plan.variantId, tier, interval, environment: config.environment,
      accountId: config.accountId, createdAt: pending.createdAt, consumedMembershipId: null };
    const batch = adminDb.batch();
    batch.set(adminDb.collection('whop_checkouts').doc(scopedId(config, checkout.id)), record);
    batch.set(pendingRef, { ...pending, checkoutId: checkout.id, url });
    await batch.commit();
    return { flow: 'checkout', provider: 'whop', url };
  });
}

async function disputeStates(payments, config) {
  if (!payments.some(p => p.dispute_created_at)) return [];
  // The Current API has no documented payment-id filter on disputes. Read the
  // account's paginated list, then join by payment ID locally.
  const disputes = await whopList('/disputes', { account_id: config.accountId }, config);
  const ids = new Set(payments.map(p => p.id));
  return disputes.filter(d => d.account_id === config.accountId && ids.has(d.payment?.id)).map(d => d.status);
}

export async function syncWhopMembership(id, config = whopConfig()) {
  if (!/^mem_\w+$/.test(id || '')) throw whopError('whop_membership_id_invalid', 400);
  return withLease(scopedId(config, id), async lease => {
    const membership = await whopRequest(`/memberships/${id}`, { config });
    const plan = config.catalog.find(p => p.variantId === membership.variant_id && p.productId === membership.product_id);
    if (membership.account?.id !== config.accountId || !plan) return { ignored: true };
    const payments = await whopList('/payments', { account_id: config.accountId, membership_id: id }, config);
    const evidence = payments.filter(p => paymentEvidence(p, membership, config));
    const linked = await linkRef(config, id).get();
    let uid = linked.data()?.uid;
    let checkoutRef;
    if (!uid) {
      const first = evidence.filter(p => p.status === 'paid' && p.paid_at && p.checkout_configuration_id)
        .sort((a, b) => new Date(a.paid_at) - new Date(b.paid_at))[0];
      if (first) {
        checkoutRef = adminDb.collection('whop_checkouts').doc(scopedId(config, first.checkout_configuration_id));
        const checkout = (await checkoutRef.get()).data();
        if (checkout?.variantId === plan.variantId && checkout.productId === plan.productId &&
            (!checkout.consumedMembershipId || checkout.consumedMembershipId === id)) uid = checkout.uid;
      }
    }
    if (!uid) {
      await adminDb.collection('whop_unlinked_purchases').doc(scopedId(config, id)).set({
        membershipId: id, reason: 'verified_ownership_required', updatedAt: new Date(), environment: config.environment,
      }, { merge: true });
      return { unlinked: true };
    }
    const record = deriveWhopMembership(membership, evidence, plan, config, new Date(), await disputeStates(evidence, config));
    const userRef = adminDb.collection('users').doc(uid);
    const outcome = await adminDb.runTransaction(async tx => {
      const [userSnap, linkSnap, lockSnap, checkoutSnap] = await Promise.all([
        tx.get(userRef), tx.get(linkRef(config, id)), tx.get(lease.ref), checkoutRef ? tx.get(checkoutRef) : Promise.resolve(null),
      ]);
      if (lockSnap.data()?.token !== lease.token || accessDate(lockSnap.data()?.until) <= new Date()) throw whopError('whop_lease_lost');
      if (!userSnap.exists) throw whopError('whop_user_missing');
      if (linkSnap.exists && linkSnap.data().uid !== uid) throw whopError('whop_already_claimed', 409);
      if (checkoutSnap?.data()?.consumedMembershipId && checkoutSnap.data().consumedMembershipId !== id) throw whopError('whop_checkout_already_consumed', 409);
      const previous = userSnap.data().whopMembership;
      const historical = previous?.id && previous.id !== id && linkSnap.exists && linkSnap.data()?.syncedAt;
      const duplicate = previous?.id && previous.id !== id && !historical && !['expired', 'canceled'].includes(previous.status);
      if (duplicate) {
        tx.set(adminDb.collection('whop_unlinked_purchases').doc(scopedId(config, id)), {
          membershipId: id, reason: 'duplicate_membership_requires_support', updatedAt: new Date(), environment: config.environment,
        }, { merge: true });
        return 'duplicate';
      }
      if (previous?.id === id && new Date(previous.providerUpdatedAt) > new Date(record.providerUpdatedAt)) throw whopError('whop_stale_snapshot');
      tx.set(linkRef(config, id), { uid, ...record }, { merge: true });
      if (!historical) tx.update(userRef, { whopMembership: record });
      if (checkoutRef) tx.update(checkoutRef, { consumedMembershipId: id });
      for (const payment of evidence) {
        tx.set(adminDb.collection('orders').doc(scopedId(config, payment.id)), {
          userId: uid, provider: 'whop', environment: config.environment, whopPaymentId: payment.id,
          subscriptionId: id, productId: plan.productId,
          status: Number(payment.refunded_amount?.amount || 0) > 0
            ? Number(payment.refunded_amount.amount) >= Number(payment.total?.amount || 0) ? 'refunded' : 'partially_refunded'
            : payment.status,
          amount: Math.round(Number(payment.total?.amount || 0) * 100), currency: payment.total?.currency || payment.currency,
          refundedAmount: Math.round(Number(payment.refunded_amount?.amount || 0) * 100),
          createdAt: accessDate(payment.created_at), paidAt: accessDate(payment.paid_at), updatedAt: new Date(),
        }, { merge: true });
      }
      return historical ? 'historical' : 'current';
    });
    if (outcome === 'duplicate') return { unlinked: true, reason: 'duplicate_membership_requires_support' };
    // Prevent reuse of a completed checkout. Failure is retried by reconciliation;
    // association checks above still prevent a second entitlement from being claimed.
    const pendingRef = adminDb.collection('whop_checkout_users').doc(scopedId(config, uid));
    const pending = (await pendingRef.get()).data();
    const pendingCheckout = pending?.checkoutId
      ? (await adminDb.collection('whop_checkouts').doc(scopedId(config, pending.checkoutId)).get()).data()
      : null;
    if (outcome === 'current' && pending?.checkoutId && pendingCheckout?.consumedMembershipId === id && record.paymentVerified) {
      try { await whopRequest(`/checkout_configurations/${pending.checkoutId}`, { method: 'DELETE', config }); }
      catch (error) { if (error.providerStatus !== 404) throw error; }
      await pendingRef.delete();
    }
    if (process.env.DISCORD_ENABLED === 'true') await enqueueDiscordSync(uid);
    return { uid, record };
  });
}

export async function processWhopEvent(event) {
  const config = whopConfig();
  if (event.account_id !== config.accountId || event.api_version !== 'v1' || event.api_version_date !== WHOP_API_VERSION) throw whopError('whop_event_scope_mismatch', 400);
  if (!/^msg_\w+$/.test(event.id || '')) throw whopError('whop_event_id_invalid', 400);
  const marker = adminDb.collection('whop_events').doc(scopedId(config, event.id));
  if ((await marker.get()).data()?.status === 'processed') return { duplicate: true };
  // Durable inbox contains identifiers only. Raw payment payloads never persist.
  await marker.set({ type: event.type, subjectId: event.data?.id || null, status: 'pending', updatedAt: new Date() }, { merge: true });
  try {
    let membershipId;
    if (event.type.startsWith('membership.')) membershipId = event.data?.id;
    else if (/^(payment|refund|dispute)\./.test(event.type)) {
      let paymentId;
      if (event.type.startsWith('payment.')) paymentId = event.data?.id;
      if (event.type.startsWith('refund.')) paymentId = (await whopRequest(`/refunds/${event.data.id}`, { config })).payment_id;
      if (event.type.startsWith('dispute.')) paymentId = (await whopRequest(`/disputes/${event.data.id}`, { config })).payment?.id;
      if (paymentId && /^pay_\w+$/.test(paymentId)) {
        const payment = await whopRequest(`/payments/${paymentId}`, { config });
        if (payment.account_id === config.accountId) membershipId = payment.membership_id;
      }
    }
    const result = membershipId ? await syncWhopMembership(membershipId, config) : { ignored: true };
    await marker.set({ status: 'processed', updatedAt: new Date(), membershipId: membershipId || null }, { merge: true });
    return result;
  } catch (error) {
    await marker.set({ status: 'failed', code: error.code || 'sync_failed', updatedAt: new Date() }, { merge: true });
    throw error;
  }
}

export async function reconcileWhopUser(uid) {
  const config = whopConfig();
  const data = (await adminDb.collection('users').doc(uid).get()).data();
  if (data?.whopMembership?.id) return syncWhopMembership(data.whopMembership.id, config);
  const pending = (await adminDb.collection('whop_checkout_users').doc(scopedId(config, uid)).get()).data();
  if (!pending?.checkoutId) return { pending: false };
  const payments = await whopList('/payments', { account_id: config.accountId, created_after: accessDate(pending.createdAt).toISOString() }, config);
  for (const payment of payments) {
    if (payment.checkout_configuration_id === pending.checkoutId && payment.membership_id) return syncWhopMembership(payment.membership_id, config);
  }
  return { pending: true };
}

// For a direct Whop purchase only after an administrator has independently
// verified control of BOTH accounts. Email address similarity is not proof.
export async function linkVerifiedWhopPurchase({ uid, membershipId, verifiedBy, evidenceNote }) {
  const config = whopConfig();
  if (!/^mem_\w+$/.test(membershipId || '') || !uid || uid.includes('/') ||
      typeof evidenceNote !== 'string' || evidenceNote.trim().length < 15 || evidenceNote.length > 500) {
    throw whopError('whop_link_evidence_required', 400);
  }
  const membership = await whopRequest(`/memberships/${membershipId}`, { config });
  const plan = config.catalog.find(p => p.productId === membership.product_id && p.variantId === membership.variant_id);
  if (!plan || membership.account?.id !== config.accountId || !membership.user_id) throw whopError('whop_membership_mismatch', 400);
  const ref = linkRef(config, membershipId);
  const userRef = adminDb.collection('users').doc(uid);
  const auditRef = adminDb.collection('admin_audit_events').doc();
  await adminDb.runTransaction(async tx => {
    const [link, user] = await Promise.all([tx.get(ref), tx.get(userRef)]);
    if (!user.exists) throw whopError('whop_user_missing', 404);
    if (link.exists && link.data().uid !== uid) throw whopError('whop_already_claimed', 409);
    const existing = user.data().whopMembership;
    if (existing?.id && existing.id !== membershipId && !['canceled', 'expired'].includes(existing.status)) throw whopError('whop_duplicate_membership', 409);
    tx.set(ref, { uid, environment: config.environment, accountId: config.accountId,
      id: membershipId, linkedAt: new Date(), linkedBy: verifiedBy }, { merge: true });
    tx.set(auditRef, { type: 'whop.manual_ownership_link', userId: uid, membershipId,
      verifiedBy, evidenceNote: evidenceNote.trim(), createdAt: new Date() });
  });
  return syncWhopMembership(membershipId, config);
}

export async function whopBillingAction(uid, action) {
  const config = whopConfig();
  const data = (await adminDb.collection('users').doc(uid).get()).data();
  const record = data?.whopMembership;
  if (!record?.id || record.environment !== config.environment || record.accountId !== config.accountId) throw whopError('whop_membership_missing', 404);
  const membership = await whopRequest(`/memberships/${record.id}`, { config });
  if (membership.account?.id !== config.accountId || membership.user_id !== record.userId) throw whopError('whop_membership_mismatch');
  if (action === 'portal') return { success: true, portal_url: trustedWhopUrl(membership.manage_url, config.environment) };
  if (action === 'cancel') {
    await whopRequest(`/memberships/${record.id}/cancel`, { config, method: 'POST',
      idempotencyKey: `go-cancel-${record.id}`, body: { cancel_at_period_end: true } });
    const result = await syncWhopMembership(record.id, config);
    if (!result.record?.cancelAtPeriodEnd && result.record?.status !== 'canceled') throw whopError('whop_cancellation_not_confirmed');
    return { success: true, endsAt: result.record.paidThrough };
  }
  throw whopError('invalid_action', 400);
}

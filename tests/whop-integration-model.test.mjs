import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { unwrapWebhook } from '@whop/sdk/helpers';
import { WHOP_CATALOG, whopConfig, configuredPlan, validateWhopVariant, deriveWhopMembership, trustedWhopUrl } from '../src/lib/whop-model.mjs';
import { resolveMembershipRecord } from '../src/lib/membership-access.mjs';

const env = { WHOP_ENVIRONMENT:'production', WHOP_ACCOUNT_ID:'biz_fXnLxutjLKO8jT', WHOP_API_KEY:'secret', WHOP_SITE_URL:'https://www.galacticomnivore.com', FIREBASE_PROJECT_ID:'go-prod', WHOP_FIREBASE_PROJECT_ID:'go-prod' };
const config = whopConfig(env);
const now = new Date('2026-11-12T12:00:00Z');
function fixture(plan) {
  const membership = { id:'mem_123', account:{id:config.accountId}, product_id:plan.productId, variant_id:plan.variantId, user_id:'user_123', status:'active', current_period_start:'2026-11-01T00:00:00Z', current_period_end:'2026-12-01T00:00:00Z', cancel_at_period_end:false, updated_at:'2026-11-01T00:00:00Z' };
  const payment = { id:'pay_123', account_id:config.accountId, membership_id:membership.id, product_id:plan.productId, variant_id:plan.variantId, user:{id:membership.user_id}, status:'paid', paid_at:'2026-11-01T00:00:00Z', total:{amount:String(plan.amount),currency:'mkd'}, refunded_amount:{amount:'0.00',currency:'mkd'} };
  return { membership, payment };
}
test('six production catalog entries resolve to unique verified products and variants', () => {
  assert.equal(WHOP_CATALOG.length, 6);
  assert.equal(new Set(config.catalog.map(p=>p.productId)).size,6);
  assert.equal(new Set(config.catalog.map(p=>p.variantId)).size,6);
  for (const plan of config.catalog) {
    assert.equal(configuredPlan(config, plan.tier, plan.interval).amount, plan.amount);
    const variant = { id:plan.variantId, product:{id:plan.productId}, account:{id:config.accountId}, currency:'mkd', billing_type:'renewal', billing_period:plan.days, initial_price:0, renewal_price:plan.amount, initial_price_due:{amount:String(plan.amount)}, release_method:'buy_now', visibility:'visible' };
    const product = {id:plan.productId, account:{id:config.accountId}};
    assert.doesNotThrow(()=>validateWhopVariant(variant,product,plan,config.accountId));
    assert.throws(()=>validateWhopVariant({...variant,renewal_price:1},product,plan,config.accountId));
    assert.throws(()=>validateWhopVariant({...variant,account:{id:'biz_other'}},product,plan,config.accountId));
  }
});
test('production database cannot be used for sandbox, and checkout URLs are pinned to Whop', () => {
  assert.throws(()=>whopConfig({...env,WHOP_ENVIRONMENT:'sandbox',WHOP_PRODUCTION_FIREBASE_PROJECT_ID:'go-prod'}));
  assert.throws(()=>trustedWhopUrl('https://whop.com.evil.example/checkout/x','production'));
  assert.throws(()=>trustedWhopUrl('https://sandbox.whop.com/checkout/x','production'));
});
test('membership requires paid matching provider evidence and expires even without a webhook', () => {
  for (const plan of config.catalog) {
    const {membership,payment}=fixture(plan);
    const grant=deriveWhopMembership(membership,[payment],plan,config,now);
    assert.equal(grant.activeMember,true); assert.equal(grant.tier,plan.tier);
    assert.equal(deriveWhopMembership(membership,[],plan,config,now).activeMember,false);
    assert.equal(deriveWhopMembership(membership,[{...payment,user:{id:'user_other'}}],plan,config,now).activeMember,false);
    assert.equal(deriveWhopMembership(membership,[payment],plan,config,new Date('2026-12-01T00:00:00Z')).activeMember,false);
    assert.equal(deriveWhopMembership({...membership,cancel_at_period_end:true},[payment],plan,config,now).activeMember,true);
    assert.equal(deriveWhopMembership(membership,[{...payment,paid_at:'2026-10-01T00:00:00Z'}],plan,config,now).activeMember,false);
  }
});
test('full refund or open dispute suspends access; partial refund and won dispute do not', () => {
  const plan=config.catalog[0], {membership,payment}=fixture(plan);
  assert.equal(deriveWhopMembership(membership,[{...payment,refunded_amount:{amount:'500',currency:'mkd'}}],plan,config,now).activeMember,false);
  assert.equal(deriveWhopMembership(membership,[{...payment,refunded_amount:{amount:'1',currency:'mkd'}}],plan,config,now).activeMember,true);
  assert.equal(deriveWhopMembership(membership,[payment],plan,config,now,['needs_response']).activeMember,false);
  assert.equal(deriveWhopMembership(membership,[payment],plan,config,now,['won']).activeMember,true);
});
test('separate Polar access remains after Whop revocation and cannot overwrite valid Whop access', () => {
  const whopMembership={id:'mem_123',environment:'production',tier:'company',activeMember:true,paymentVerified:true,status:'active',paidThrough:'2026-12-01T00:00:00Z'};
  const data={subscriptionId:'polar_123',activeMember:false,subscriptionStatus:'revoked',subscriptionEndsAt:'2027-01-01T00:00:00Z',membershipTier:'member',whopMembership};
  assert.equal(resolveMembershipRecord(data,now).tier,'company');
  assert.equal(resolveMembershipRecord({...data,activeMember:true,subscriptionStatus:'active',whopMembership:{...whopMembership,activeMember:false}},now).provider,'polar');
  assert.equal(resolveMembershipRecord(data,new Date('2026-12-01T00:00:00Z')).active,false);
});
test('Whop helper verifies the raw body and rejects modified or replayed signatures', () => {
  const secret='ws_test-secret', timestamp=String(Math.floor(Date.now()/1000)), id='msg_test';
  const body=JSON.stringify({id,type:'payment.succeeded'});
  const signature=createHmac('sha256',secret).update(`${id}.${timestamp}.${body}`).digest('base64');
  const headers={'webhook-id':id,'webhook-timestamp':timestamp,'webhook-signature':`v1,${signature}`};
  assert.equal(unwrapWebhook(body,{headers,key:secret}).id,id);
  assert.throws(()=>unwrapWebhook(body+' ',{headers,key:secret}));
  assert.throws(()=>unwrapWebhook(body,{headers:{...headers,'webhook-timestamp':String(Number(timestamp)-600)},key:secret}));
});

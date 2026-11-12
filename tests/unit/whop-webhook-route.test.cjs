const test = require('node:test');
const assert = require('node:assert/strict');
const { createHmac } = require('node:crypto');
const { unwrapWebhook } = require('@whop/sdk/helpers');
const { loadSourceModule } = require('../helpers/load-source-module.cjs');
const secret = 'ws_unit-test';
const event = { id: 'msg_123', type: 'payment.succeeded', data: { id: 'pay_123' } };
function signed(body, id = event.id) {
  const timestamp = String(Math.floor(Date.now() / 1000));
  const sig = createHmac('sha256', secret).update(`${id}.${timestamp}.${body}`).digest('base64');
  return { headers: new Headers({ 'webhook-id':id, 'webhook-timestamp':timestamp, 'webhook-signature':`v1,${sig}` }), text:async()=>body };
}
function route(processWhopEvent) {
  return loadSourceModule('src/app/api/webhooks/whop/route.js', ['POST'], {
    stripImports:true, sandbox:{ Response, unwrapWebhook, processWhopEvent, process:{env:{WHOP_WEBHOOK_SECRET:secret}} },
  });
}
test('valid signed webhook reaches reconciliation exactly once per delivery', async () => {
  let calls=0;const {POST}=route(async received=>{calls++;assert.equal(received.id,event.id);});
  const result=await POST(signed(JSON.stringify(event)));assert.equal(result.status,200);assert.equal(calls,1);
});
test('tampered signature and mismatched header ID cannot reach processing', async () => {
  let calls=0;const {POST}=route(async()=>{calls++;});const body=JSON.stringify(event);
  const request=signed(body); request.text=async()=>body+' ';
  assert.equal((await POST(request)).status,400);
  assert.equal((await POST(signed(body,'msg_other'))).status,400);
  assert.equal(calls,0);
});
test('a processing failure returns 503 so Whop can retry', async () => {
  const {POST}=route(async()=>{throw Object.assign(new Error('nope'),{code:'whop_sync_busy'});});
  assert.equal((await POST(signed(JSON.stringify(event)))).status,503);
});

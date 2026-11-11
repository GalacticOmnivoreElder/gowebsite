import { unwrapWebhook } from '@whop/sdk/helpers';
import { processWhopEvent } from '@/lib/whop';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request) {
  if (!process.env.WHOP_WEBHOOK_SECRET) return Response.json({ error: 'Webhook not configured' }, { status: 503 });
  let event;
  try {
    const rawBody = await request.text();
    if (Buffer.byteLength(rawBody) > 1024 * 1024) return Response.json({ error: 'Payload too large' }, { status: 413 });
    event = unwrapWebhook(rawBody, { headers: Object.fromEntries(request.headers), key: process.env.WHOP_WEBHOOK_SECRET });
    if (event.id !== request.headers.get('webhook-id')) throw new Error('Event ID mismatch');
  } catch {
    return Response.json({ error: 'Invalid webhook' }, { status: 400 });
  }
  try {
    await processWhopEvent(event);
    return Response.json({ received: true });
  } catch (error) {
    console.error('whop_webhook_failed', { eventId: event.id, code: error.code || 'sync_failed', providerStatus: error.providerStatus });
    return Response.json({ error: 'Webhook processing failed' }, { status: error.status === 400 ? 400 : 503 });
  }
}

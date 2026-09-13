import { DESTINATIONS, resolveGoRoute } from '@/lib/go-routes.mjs';
export async function GET(request) {
    const key = new URL(request.url).searchParams.get('key') ?? 'education';
    if (!Object.hasOwn(DESTINATIONS, key))
        return new Response('Unknown learning route', { status: 400 });
    const route = await resolveGoRoute(key);
    if (route.verified)
        return new Response(null, { status: 302, headers: { Location: route.href, 'Cache-Control': 'no-store' } });
    return new Response('<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>GO learning is temporarily unavailable</title><body style="background:#000;color:white;font:20px system-ui;max-width:40rem;margin:15vh auto;padding:24px"><h1>That galaxy is out of reach.</h1><p>We could not verify GO’s learning pages right now. The direct link below is unverified.</p><p><a style="color:white" href="https://www.galacticomnivore.com/education">Try GO Education directly</a></p><p><a style="color:white" href="/learn">Return to the Omnivore</a></p></body></html>', { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
}

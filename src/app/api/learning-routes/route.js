import { DESTINATIONS, resolveGoRoute } from '@/lib/go-routes.mjs';
export async function GET(request) {
    const keys = [...new Set((new URL(request.url).searchParams.get('keys') ?? 'orientation').split(','))];
    if (keys.length > 3 || keys.some(key => !Object.hasOwn(DESTINATIONS, key))) {
        return Response.json({ error: 'Use up to three known learning route keys.' }, { status: 400 });
    }
    const routes = await Promise.all(keys.map(async (key) => [key, await resolveGoRoute(key)]));
    return Response.json({ routes: Object.fromEntries(routes) }, { headers: { 'Cache-Control': 'public, max-age=30' } });
}

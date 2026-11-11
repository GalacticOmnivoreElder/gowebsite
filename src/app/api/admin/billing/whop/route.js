import { getRequestUser } from '@/lib/auth-utils';
import { auditWhopPlan, whopRequest, reconcileWhopUser } from '@/lib/whop';
import { WHOP_CATALOG, WHOP_API_VERSION } from '@/lib/whop-model.mjs';

export async function GET(request) {
  const user = await getRequestUser(request);
  if (!user?.admin) return Response.json({ error: 'Admin access required' }, { status: 403 });
  try {
    const catalog = [];
    for (const plan of WHOP_CATALOG) catalog.push(await auditWhopPlan(plan.tier, plan.interval));
    const permissions = await whopRequest('/api_keys/permissions');
    return Response.json({ apiVersion: WHOP_API_VERSION, catalog, permissionCatalog: permissions.data });
  } catch (error) {
    return Response.json({ error: error.code || 'audit_failed', fields: error.fields, providerStatus: error.providerStatus }, { status: 503 });
  }
}

export async function POST(request) {
  const user = await getRequestUser(request);
  if (!user?.admin) return Response.json({ error: 'Admin access required' }, { status: 403 });
  const { uid } = await request.json().catch(() => ({}));
  if (typeof uid !== 'string' || !uid || uid.includes('/')) return Response.json({ error: 'Valid user ID required' }, { status: 400 });
  try { return Response.json(await reconcileWhopUser(uid)); }
  catch (error) { return Response.json({ error: error.code || 'reconciliation_failed' }, { status: 503 }); }
}

import { getRequestUser } from '@/lib/auth-utils';
import { isExpiredWorkspace, hasMentorAddon } from '@/lib/go-policy';
import { readProjectCapacity } from '@/lib/project-capacity';

export const dynamic = 'force-dynamic';
export async function GET(request) {
  try {
    const user = await getRequestUser(request);
    if (!user) return Response.json({ error: 'Sign in to view your access.' }, { status: 401 });
    const capacity = await readProjectCapacity(user);
    return Response.json({ activeMember: user.activeMember, tier: user.membershipTier, admin: user.admin,
      frozen: !user.admin && isExpiredWorkspace(user.userData, user.activeMember), capacity,
      mentorApproved: user.userData.mentorStatus === 'approved', mentorAddon: hasMentorAddon(user.userData) }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch { return Response.json({ error: 'Your access could not be checked. Please retry.' }, { status: 503 }); }
}

export const dynamic = "force-dynamic";
import { getEffectiveMembership } from "@/lib/auth-utils";
import { readPassport, reconcileAssetStamps } from "@/lib/community-build-service";
import { communityRequest } from "@/lib/community-build-route";
export function GET(request) { return communityRequest(request, async (user) => ({ ...await readPassport(user.uid), userId: user.uid, activeMember: getEffectiveMembership(user.userData || {}, { admin: false }).activeMember }), { auth: true }); }
export function POST(request) { return communityRequest(request, (user) => reconcileAssetStamps(user.uid), { auth: true }); }

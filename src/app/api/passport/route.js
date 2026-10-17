export const dynamic = "force-dynamic";
import { getEffectiveMembership } from "@/lib/auth-utils";
import { readPassport, reconcileAssetStamps } from "@/lib/community-build-service";
import { setPassportDisplay } from "@/lib/go-journey-service";
import { communityBody, communityRequest } from "@/lib/community-build-route";
export function GET(request) { return communityRequest(request, async (user) => ({ ...await readPassport(user.uid, { owner: true }), userId: user.uid, activeMember: getEffectiveMembership(user.userData || {}, { admin: false }).activeMember }), { auth: true }); }
export function POST(request) { return communityRequest(request, (user) => reconcileAssetStamps(user.uid), { auth: true }); }
export function PATCH(request) { return communityRequest(request, async (user) => { const body = await communityBody(request); return setPassportDisplay(user.uid, body.stampId, body.isDisplayed); }, { auth: true }); }

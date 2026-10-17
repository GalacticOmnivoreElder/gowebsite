export const dynamic = "force-dynamic";
import { managePassportStamp } from "@/lib/community-build-service";
import { communityRequest, communityBody } from "@/lib/community-build-route";
export function POST(request) { return communityRequest(request, async (user) => managePassportStamp(user, await communityBody(request)), { auth: true, admin: true }); }

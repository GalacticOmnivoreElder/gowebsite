export const dynamic = "force-dynamic";
import { getBuildBoard, castBuildVote } from "@/lib/community-build-service";
import { communityRequest, communityBody } from "@/lib/community-build-route";
export function GET(request) { return communityRequest(request, (user) => getBuildBoard(user)); }
export function POST(request) {
  return communityRequest(request, async (user) => {
    const body = await communityBody(request);
    return castBuildVote(user, body.optionId, body.weekId);
  }, { auth: true });
}

export const dynamic = "force-dynamic";
import { getBuildBoard, manageBuildPoll, readPassport } from "@/lib/community-build-service";
import { communityRequest, communityBody } from "@/lib/community-build-route";
import { currentBuildPeriod, periodForKey, shiftDate, problem } from "@/lib/monday-builds.mjs";
export function GET(request) {
  return communityRequest(request, async (user) => {
    const uid = new URL(request.url).searchParams.get("userId");
    if (uid) {
      if (uid.includes("/") || uid.length > 128) throw problem("Invalid user ID");
      return readPassport(uid);
    }
    const current = currentBuildPeriod();
    return { ...await getBuildBoard(user), nextPeriod: periodForKey(shiftDate(current.key, 7)) };
  }, { auth: true, admin: true });
}
export function POST(request) { return communityRequest(request, async (user) => manageBuildPoll(user, await communityBody(request)), { auth: true, admin: true }); }

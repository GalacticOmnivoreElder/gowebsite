import { NextResponse } from "next/server";
import {
  enqueueDailyEmailFailureDigest,
  processEmailOutbox,
  requeueExpiredEmailJobs,
} from "@/lib/email";
import { verifyGithubActionsOidcToken } from "@/lib/githubActionsOidc";

async function authorized(request) {
  const authorization = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (secret && authorization === `Bearer ${secret}`) return true;
  if (!authorization?.startsWith("Bearer ")) return false;

  return verifyGithubActionsOidcToken(authorization.slice("Bearer ".length));
}

async function run(request) {
  if (!(await authorized(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const requeued = await requeueExpiredEmailJobs();
  const digest = await enqueueDailyEmailFailureDigest();
  const result = await processEmailOutbox();
  return NextResponse.json({ requeued, digest, ...result });
}

export const GET = run;
export const POST = run;

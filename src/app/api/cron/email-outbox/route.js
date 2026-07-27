import { NextResponse } from "next/server";
import {
  enqueueDailyEmailFailureDigest,
  processEmailOutbox,
  requeueExpiredEmailJobs,
} from "@/lib/email";

function authorized(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

async function run(request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const requeued = await requeueExpiredEmailJobs();
  const digest = await enqueueDailyEmailFailureDigest();
  const result = await processEmailOutbox();
  return NextResponse.json({ requeued, digest, ...result });
}

export const GET = run;
export const POST = run;

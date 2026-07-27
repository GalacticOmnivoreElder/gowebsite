import { NextResponse } from "next/server";
import {
  enqueueDailyEmailFailureDigest,
  getEmailConfigurationStatus,
  processEmailOutbox,
  requeueExpiredEmailJobs,
  sendEmailDeliveryTest,
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
  const configuration = getEmailConfigurationStatus();
  try {
    const testRecipient = request.headers.get("x-email-test-recipient");
    const deliveryTest = testRecipient
      ? await sendEmailDeliveryTest(testRecipient)
      : null;
    const requeued = await requeueExpiredEmailJobs();
    const digest = await enqueueDailyEmailFailureDigest();
    const result = await processEmailOutbox();
    return NextResponse.json({
      requeued,
      digest,
      ...result,
      configuration,
      deliveryTest,
    });
  } catch (error) {
    console.error(
      JSON.stringify({
        level: "error",
        message: "email_outbox_worker_failed",
        route: "/api/cron/email-outbox",
        requestId: request.headers.get("x-vercel-id") || null,
        errorCode: error?.code || error?.name || "unknown",
        error: String(error?.message || "Unknown email worker error").slice(
          0,
          500
        ),
      })
    );
    return NextResponse.json(
      {
        error: "Email worker failed",
        errorCode: error?.code || error?.name || "unknown",
        configuration,
      },
      { status: 500 }
    );
  }
}

export const GET = run;
export const POST = run;

import { NextResponse } from "next/server";
import {
  enqueueDailyEmailFailureDigest,
  getEmailConfigurationStatus,
  processEmailOutbox,
  requeueExpiredEmailJobs,
  sendEmailDeliveryTest,
} from "@/lib/email";
import { verifyGithubActionsOidcToken } from "@/lib/githubActionsOidc";
import { processExpiredWaitlistOffers } from "@/lib/learning-enrollment";
import { processExpiredMentorRequests } from "@/lib/mentorship-service";

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
    let learningWaitlist;
    try {
      learningWaitlist = await processExpiredWaitlistOffers();
    } catch (waitlistError) {
      learningWaitlist = { error: "Waitlist processing failed" };
      console.error("learning_waitlist_worker_failed", {
        code: waitlistError?.code || "unknown",
      });
    }
    let mentorRequests;
    try {
      mentorRequests = await processExpiredMentorRequests();
    } catch (mentorRequestError) {
      mentorRequests = { error: "Mentor request expiry processing failed" };
      console.error("mentor_request_worker_failed", { code: mentorRequestError?.code || "unknown" });
    }
    return NextResponse.json({
      requeued,
      digest,
      ...result,
      configuration,
      deliveryTest,
      learningWaitlist,
      mentorRequests,
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

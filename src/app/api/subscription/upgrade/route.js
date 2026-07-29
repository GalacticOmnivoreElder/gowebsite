import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { getRequestUser } from "@/lib/auth-utils";
import { schedulePolarProductChange } from "@/lib/polar";
import {
  buildBusinessUpgradePreview,
  getPendingSubscriptionUpdate,
  getPendingUpgradeFirestoreData,
  SubscriptionUpgradeError,
} from "@/lib/subscription-upgrade";

function getInterval(request, body = {}) {
  const queryInterval = new URL(request.url).searchParams.get("interval");
  const interval = body?.interval || queryInterval;
  if (!["monthly", "annual"].includes(interval)) {
    throw new SubscriptionUpgradeError(
      "Choose a monthly or annual Business membership.",
      "invalid_interval",
      400
    );
  }
  return interval;
}

function errorResponse(error) {
  if (error instanceof SubscriptionUpgradeError) {
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: error.status }
    );
  }

  console.error("Business subscription upgrade failed:", error);
  const status = error?.status;
  return NextResponse.json(
    {
      error:
        status === 409 || status === 422
          ? "Polar could not schedule this plan change. Review the current subscription in Billing."
          : "The Business upgrade could not be verified with Polar. Please try again.",
      code: "upgrade_failed",
    },
    { status: status === 401 || status === 403 ? status : 503 }
  );
}

export async function GET(request) {
  try {
    const user = await getRequestUser(request);
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const preview = await buildBusinessUpgradePreview(
      user,
      getInterval(request)
    );
    return NextResponse.json({ preview });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request) {
  try {
    const user = await getRequestUser(request);
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const preview = await buildBusinessUpgradePreview(
      user,
      getInterval(request, body)
    );

    let pendingUpdate = preview.pendingUpdate;
    let alreadyScheduled = preview.pending;
    if (!alreadyScheduled) {
      const updatedSubscription = await schedulePolarProductChange(
        preview.subscriptionId,
        preview.targetPlan.productId
      );
      pendingUpdate = getPendingSubscriptionUpdate(updatedSubscription);
      if (
        !pendingUpdate ||
        pendingUpdate.productId !== preview.targetPlan.productId
      ) {
        throw new SubscriptionUpgradeError(
          "Polar did not confirm the scheduled Business upgrade.",
          "pending_update_not_confirmed",
          502
        );
      }
    }

    const pendingData = getPendingUpgradeFirestoreData(
      preview,
      pendingUpdate
    );
    await adminDb.collection("users").doc(user.uid).update({
      ...pendingData,
      updatedAt: new Date(),
    });

    return NextResponse.json({
      scheduled: true,
      alreadyScheduled,
      upgrade: {
        ...pendingData,
        currentTier: "member",
        targetPlan: preview.targetPlan,
        noChargeToday: true,
        priceIsEstimate: preview.priceIsEstimate,
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}

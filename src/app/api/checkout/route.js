import { NextResponse } from "next/server";
import { Polar } from "@polar-sh/sdk";
import { getRequestUser } from "@/lib/auth-utils";
import { getPolarServer, resolvePolarProductId } from "@/lib/polar";

/**
 * Create a Polar checkout session on the server.
 *
 * Why not the simple `Checkout()` adapter?
 *  - It runs from the server, so Polar sees the SERVER's IP and can pick the
 *    wrong currency for the customer. Here we forward `customerIpAddress` so
 *    Polar localizes currency by the actual buyer.
 *  - Identity comes from the verified Firebase token, not spoofable query
 *    params. We link the checkout to the buyer via `externalCustomerId` (their
 *    uid) and, once we know their Polar customer, via `customerId` — which
 *    makes Polar LOCK the email field during checkout.
 */
function getClientIp(request) {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return (
    request.headers.get("x-real-ip") ||
    request.headers.get("cf-connecting-ip") ||
    undefined
  );
}

export async function POST(request) {
  const body = await request.json().catch(() => ({}));

  const user = await getRequestUser(request);
  if (!user) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 }
    );
  }

  const tier = body?.tier === "company" ? "company" : "member";
  const interval = body?.interval === "annual" ? "annual" : "monthly";
  // Product selection is server-owned. Accepting an arbitrary productId from
  // the browser could pair a Community price with Business tier metadata.
  const productId = resolvePolarProductId(tier, interval);

  if (!productId) {
    return NextResponse.json(
      {
        error: `No Polar product configured for the ${tier} ${interval} plan.`,
      },
      { status: 400 }
    );
  }

  if (!process.env.POLAR_ACCESS_TOKEN) {
    return NextResponse.json(
      { error: "Polar is not configured (missing POLAR_ACCESS_TOKEN)." },
      { status: 500 }
    );
  }

  const polar = new Polar({
    accessToken: process.env.POLAR_ACCESS_TOKEN,
    server: getPolarServer(),
  });

  const origin = new URL(request.url).origin;
  const successUrl =
    process.env.POLAR_SUCCESS_URL || `${origin}/subscription/success`;
  const userData = user.userData || {};
  const currentTier = user.membershipTier || userData.membershipTier || null;
  const subscriptionEnding =
    userData.subscriptionStatus === "canceled" ||
    userData.willRenew === false;

  if (user.activeMember) {
    if (currentTier !== "member" || tier !== "company") {
      return NextResponse.json(
        {
          error:
            "This account already has an active membership. Manage the current plan from Billing.",
          code: "active_membership",
        },
        { status: 409 }
      );
    }

    if (subscriptionEnding) {
      return NextResponse.json(
        {
          error:
            "This membership is scheduled to end. Manage or reactivate it from Billing before changing plans.",
          code: "subscription_ending",
        },
        { status: 409 }
      );
    }

    if (!userData.subscriptionId) {
      return NextResponse.json(
        {
          error:
            "We could not identify the active Polar subscription. Please contact support before upgrading.",
          code: "missing_subscription",
        },
        { status: 409 }
      );
    }

    try {
      const activeSubscription = await polar.subscriptions.get({
        id: userData.subscriptionId,
      });
      const targetRecurringInterval =
        interval === "annual" ? "year" : "month";
      if (
        activeSubscription?.recurringInterval &&
        activeSubscription.recurringInterval !== targetRecurringInterval
      ) {
        return NextResponse.json(
          {
            error:
              "Changing both tier and billing interval can trigger an immediate prorated invoice. Select the current billing interval or manage the change in Billing.",
            code: "interval_change_requires_confirmation",
          },
          { status: 409 }
        );
      }

      await polar.subscriptions.update({
        id: userData.subscriptionId,
        subscriptionUpdate: {
          productId,
          // For a same-interval change, Polar applies the product now while
          // carrying the prorated difference to the next renewal invoice.
          prorationBehavior: "prorate",
        },
      });

      return NextResponse.json({
        upgraded: true,
        url: successUrl,
      });
    } catch (error) {
      console.error("Polar subscription upgrade failed:", error);
      const status = error?.statusCode || error?.status;
      return NextResponse.json(
        {
          error:
            status === 409 || status === 422
              ? "Polar could not change this active subscription. Please manage billing or contact support."
              : "Failed to upgrade the active subscription.",
          code: "upgrade_failed",
        },
        { status: status === 409 || status === 422 ? 409 : 500 }
      );
    }
  }

  const checkoutInput = {
    products: [productId],
    successUrl,
    customerIpAddress: getClientIp(request),
    metadata: {
      uid: user.uid,
      tier,
      interval,
    },
  };

  // Always link by external id (the Firebase uid) rather than a stored Polar
  // customerId. Polar links to the existing customer when one matches this
  // external id — which locks the email — or creates a new customer otherwise.
  // This is robust across environment/org switches; a stored polarCustomerId
  // from a different org would 422 with "Customer does not exist". The webhook
  // refreshes users.polarCustomerId to the correct value after checkout.
  checkoutInput.externalCustomerId = user.uid;
  if (user.email) {
    checkoutInput.customerEmail = user.email;
  }

  try {
    const checkout = await polar.checkouts.create(checkoutInput);
    return NextResponse.json({ url: checkout.url });
  } catch (error) {
    console.error("Polar checkout create failed:", error);

    const status = error?.statusCode || error?.status;
    let hint;
    if (status === 401) {
      hint =
        `Polar rejected the access token (401 invalid_token). Make sure ` +
        `POLAR_ACCESS_TOKEN matches POLAR_SERVER — you're on "${getPolarServer()}", ` +
        `so it must be a ${getPolarServer()} token.`;
    } else if (status === 404 || status === 422) {
      hint =
        `Polar could not find/accept the product (${productId}). Make sure this ` +
        `product id exists in the "${getPolarServer()}" organization for the ${tier} ${interval} plan.`;
    }

    return NextResponse.json(
      {
        error: "Failed to create checkout session.",
        // Surface the cause in development to speed up config debugging.
        ...(process.env.NODE_ENV === "development"
          ? { hint, polarStatus: status, details: error?.body || error?.message }
          : {}),
      },
      { status: 500 }
    );
  }
}

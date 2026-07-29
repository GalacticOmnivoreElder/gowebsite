import { NextResponse } from "next/server";
import { Polar } from "@polar-sh/sdk";
import { getRequestUser } from "@/lib/auth-utils";
import {
  getPolarServer,
  resolvePolarProductId,
} from "@/lib/polar";

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

  const origin = new URL(request.url).origin;
  const successUrl =
    process.env.POLAR_SUCCESS_URL || `${origin}/subscription/success`;
  const userData = user.userData || {};
  const currentTier = user.membershipTier || userData.membershipTier || null;
  const subscriptionEnding =
    userData.subscriptionStatus === "canceled" ||
    userData.willRenew === false;

  if (user.activeMember) {
    const isBusinessUpgrade = currentTier === "member" && tier === "company";
    return NextResponse.json(
      {
        error: subscriptionEnding
          ? "This membership is scheduled to end. Reactivate it from Billing before changing plans."
          : isBusinessUpgrade
          ? "Review and confirm this Business upgrade from the membership page."
          : "This account already has an active membership. Manage the current plan from Billing.",
        code: subscriptionEnding
          ? "subscription_ending"
          : isBusinessUpgrade
          ? "upgrade_confirmation_required"
          : "active_membership",
        ...(isBusinessUpgrade && !subscriptionEnding
          ? { upgradeUrl: "/membership#plans" }
          : {}),
      },
      { status: 409 }
    );
  }

  const polar = new Polar({
    accessToken: process.env.POLAR_ACCESS_TOKEN,
    server: getPolarServer(),
  });

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
    return NextResponse.json({ flow: "checkout", url: checkout.url });
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

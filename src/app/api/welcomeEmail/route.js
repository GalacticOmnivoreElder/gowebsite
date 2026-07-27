import { NextResponse } from "next/server";
import { getRequestUser } from "@/lib/auth-utils";
import { enqueueEmailEvent } from "@/lib/email";

export async function POST(request) {
  try {
    const user = await getRequestUser(request);
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }
    if (!user.email) {
      return NextResponse.json(
        { error: "The signed-in account does not have an email address" },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const displayName =
      user.userData?.username ||
      body.username ||
      body.name ||
      user.email.split("@")[0] ||
      "Creator";
    const result = await enqueueEmailEvent({
      type: "account.welcome",
      eventId: user.uid || user.email,
      userId: user.uid || null,
      recipient: user.email,
      data: { displayName },
    });

    return NextResponse.json({
      success: true,
      queued: result.created,
      emailJobId: result.id,
    });
  } catch (error) {
    console.error("Could not queue welcome email:", {
      code: error.code || "queue_failed",
    });
    return NextResponse.json(
      { error: "Failed to queue welcome email" },
      { status: 500 }
    );
  }
}

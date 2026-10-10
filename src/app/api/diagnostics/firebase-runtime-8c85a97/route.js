import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function safeError(error) {
  return {
    name: String(error?.name || "Error").slice(0, 80),
    code: String(error?.code || error?.errorInfo?.code || "").slice(0, 120),
    message: String(error?.message || error || "Unknown error").slice(0, 500),
  };
}

export async function GET() {
  let firebase;
  try {
    firebase = await import("@/lib/firebase-admin");
  } catch (error) {
    return NextResponse.json(
      { ok: false, stage: "import", error: safeError(error) },
      { status: 500 }
    );
  }

  try {
    await firebase.adminDb.collection("projects").limit(1).get();
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { ok: false, stage: "query", error: safeError(error) },
      { status: 500 }
    );
  }
}

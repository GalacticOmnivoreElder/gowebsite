import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function classify(error) {
  const value = `${error?.code || ""} ${error?.message || ""}`.toLowerCase();
  if (value.includes("firebase admin: set")) return "missing_credentials";
  if (value.includes("private key") || value.includes("pem")) {
    return "invalid_private_key";
  }
  if (value.includes("module not found") || value.includes("cannot find module")) {
    return "module_not_found";
  }
  if (value.includes("permission_denied") || value.includes("permission denied")) {
    return "permission_denied";
  }
  if (value.includes("unauthenticated")) return "unauthenticated";
  if (value.includes("project id")) return "project_id_mismatch";
  return "unexpected";
}

export async function GET() {
  let firebase;
  try {
    firebase = await import("@/lib/firebase-admin");
  } catch (error) {
    return NextResponse.json(
      { ok: false, stage: "import", category: classify(error) },
      { status: 500 }
    );
  }

  try {
    await firebase.adminDb.collection("projects").limit(1).get();
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { ok: false, stage: "query", category: classify(error) },
      { status: 500 }
    );
  }
}

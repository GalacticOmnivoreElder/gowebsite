export const dynamic = "force-dynamic";

import { getRequestUser } from "@/lib/auth-utils";
import { adminDb } from "@/lib/firebase-admin";
import { getProductConfig } from "@/lib/product-config";

async function requireAdmin(request) {
  const user = await getRequestUser(request);
  if (!user) return { response: Response.json({ error: "Authentication required" }, { status: 401 }) };
  if (!user.admin) return { response: Response.json({ error: "Platform admin access required" }, { status: 403 }) };
  return { user };
}

export async function GET(request) {
  const gate = await requireAdmin(request);
  if (gate.response) return gate.response;

  const config = getProductConfig();
  const doc = await adminDb.collection("site_settings").doc("product").get();
  const settings = doc.exists ? doc.data() : {};
  return Response.json({
    mentorApplicationsConfigured: config.mentorApplicationsConfigured,
    mentorApplicationsOpen: settings.mentorApplicationsOpen === true,
  });
}

export async function PUT(request) {
  const gate = await requireAdmin(request);
  if (gate.response) return gate.response;
  const body = await request.json().catch(() => ({}));
  if (typeof body.mentorApplicationsOpen !== "boolean") {
    return Response.json({ error: "mentorApplicationsOpen must be a boolean" }, { status: 400 });
  }

  const now = new Date();
  await adminDb.collection("site_settings").doc("product").set(
    {
      mentorApplicationsOpen: body.mentorApplicationsOpen,
      updatedAt: now,
      updatedBy: gate.user.uid,
    },
    { merge: true }
  );
  await adminDb.collection("admin_audit_events").add({
    action: "product_settings.mentor_applications_open_updated",
    actorEmail: gate.user.email,
    actorId: gate.user.uid,
    createdAt: now,
    value: body.mentorApplicationsOpen,
  });

  const config = getProductConfig();
  return Response.json({
    mentorApplicationsConfigured: config.mentorApplicationsConfigured,
    mentorApplicationsOpen: body.mentorApplicationsOpen,
  });
}

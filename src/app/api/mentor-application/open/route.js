export const dynamic = "force-dynamic";

import { getRequestUser } from "@/lib/auth-utils";
import { getProductSettings } from "@/lib/product-settings";
import {
  MENTOR_APPLICATIONS_CLOSED_MESSAGE,
  areMentorApplicationsOpen,
  getProductConfig,
} from "@/lib/product-config";

export async function POST(request) {
  const user = await getRequestUser(request);
  if (!user) {
    return Response.json({ error: "Authentication required" }, { status: 401 });
  }

  const config = getProductConfig();
  const settings = await getProductSettings().catch(() => ({}));
  if (!areMentorApplicationsOpen(config, settings)) {
    return Response.json(
      { error: MENTOR_APPLICATIONS_CLOSED_MESSAGE },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }

  return Response.json(
    { url: config.mentorApplicationUrl },
    { headers: { "Cache-Control": "no-store" } }
  );
}

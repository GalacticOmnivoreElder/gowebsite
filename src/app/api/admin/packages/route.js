import { NextResponse } from "next/server";
import { getRequestUser } from "@/lib/auth-utils";
import { adminDb } from "@/lib/firebase-admin";
import { addEmailEventToBatch } from "@/lib/email";
import { normalizeEmail } from "@/lib/email/utils";

const ALLOWED_FIELDS = [
  "slug",
  "title",
  "description",
  "month",
  "year",
  "theme",
  "coverImage",
  "brandColor",
  "assets",
  "status",
];

async function requireAdmin(request) {
  const user = await getRequestUser(request);
  if (!user) {
    return {
      response: NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      ),
    };
  }
  if (!user.admin) {
    return {
      response: NextResponse.json(
        { error: "Platform admin access required" },
        { status: 403 }
      ),
    };
  }
  return { user };
}

function cleanPackage(input) {
  const clean = {};
  ALLOWED_FIELDS.forEach((field) => {
    if (input?.[field] !== undefined) clean[field] = input[field];
  });
  clean.status = clean.status === "published" ? "published" : "draft";
  clean.title = String(clean.title || "").trim().slice(0, 160);
  clean.slug = String(clean.slug || "").trim().slice(0, 160);
  clean.description = String(clean.description || "").trim().slice(0, 5000);
  clean.assets = Array.isArray(clean.assets)
    ? clean.assets.slice(0, 100).map((asset) => ({
        type: String(asset.type || "").slice(0, 50),
        title: String(asset.title || "").slice(0, 200),
        description: String(asset.description || "").slice(0, 2000),
        image: String(asset.image || "").slice(0, 2000),
        downloadUrl: String(asset.downloadUrl || "").slice(0, 2000),
      }))
    : [];
  if (!clean.title || !clean.slug) {
    const error = new Error("Package title and slug are required");
    error.code = "validation_error";
    throw error;
  }
  return clean;
}

export async function GET(request) {
  const gate = await requireAdmin(request);
  if (gate.response) return gate.response;
  const snapshot = await adminDb.collection("packages").get();
  return NextResponse.json(
    snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
  );
}

export async function POST(request) {
  const gate = await requireAdmin(request);
  if (gate.response) return gate.response;
  try {
    const body = await request.json();
    if (Array.isArray(body.packages)) {
      const batch = adminDb.batch();
      body.packages.slice(0, 100).forEach((item) => {
        const id = String(item.id || "").trim().slice(0, 160);
        if (!id) return;
        const clean = cleanPackage({ ...item, status: item.status || "draft" });
        batch.set(
          adminDb.collection("packages").doc(id),
          {
            ...clean,
            createdAt: new Date(),
            updatedAt: new Date(),
            lastModifiedBy: gate.user.uid,
          },
          { merge: true }
        );
      });
      await batch.commit();
      return NextResponse.json({ success: true });
    }

    const id = String(body.id || body.package?.id || "")
      .trim()
      .slice(0, 160);
    if (!id) {
      return NextResponse.json(
        { error: "Package id is required" },
        { status: 400 }
      );
    }
    const ref = adminDb.collection("packages").doc(id);
    const existing = await ref.get();
    const previous = existing.exists ? existing.data() : null;
    const clean = cleanPackage(body.package || body);
    const now = new Date();
    const newlyPublished =
      clean.status === "published" &&
      !previous?.publishedAt &&
      (!previous || previous.status === "draft");
    const data = {
      ...clean,
      createdAt: previous?.createdAt || now,
      updatedAt: now,
      lastModifiedBy: gate.user.uid,
      publishedAt: newlyPublished
        ? now
        : previous?.publishedAt ||
          (clean.status === "published"
            ? previous?.createdAt || now
            : null),
      notificationQueuedAt: newlyPublished
        ? now
        : previous?.notificationQueuedAt || null,
    };

    let users = { docs: [] };
    if (newlyPublished) {
      users = await adminDb
        .collection("users")
        .where("activeMember", "==", true)
        .limit(500)
        .get();
    }

    const batch = adminDb.batch();
    batch.set(ref, data, { merge: true });
    users.docs.forEach((userDoc) => {
      const userData = userDoc.data();
      const recipient = normalizeEmail(userData.email);
      if (!recipient) return;
      addEmailEventToBatch(batch, {
        type: "package.published",
        eventId: id,
        userId: userDoc.id,
        recipient,
        data: {
          packageId: id,
          packageTitle: data.title,
          slug: data.slug,
          description: data.description,
        },
      }, now);
    });
    await batch.commit();

    return NextResponse.json({ id, ...data });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error.code === "validation_error"
            ? error.message
            : "Failed to save package",
      },
      { status: error.code === "validation_error" ? 400 : 500 }
    );
  }
}

export async function DELETE(request) {
  const gate = await requireAdmin(request);
  if (gate.response) return gate.response;
  const body = await request.json().catch(() => ({}));
  const ids = Array.isArray(body.ids) ? body.ids.slice(0, 100) : [];
  if (!ids.length) {
    return NextResponse.json(
      { error: "At least one package id is required" },
      { status: 400 }
    );
  }
  const batch = adminDb.batch();
  ids.forEach((id) => {
    if (typeof id === "string" && id.trim()) {
      batch.delete(adminDb.collection("packages").doc(id.trim()));
    }
  });
  await batch.commit();
  return NextResponse.json({ success: true, deleted: ids.length });
}

import { getRequestUser } from "@/lib/auth-utils";
import { adminDb } from "@/lib/firebase-admin";
import { PUBLIC_PROJECT_STATUSES } from "@/lib/project-utils";
import { createHash } from "node:crypto";
import { isPublicLearningStatus } from "@/lib/content-visibility";

const idsFor = (user) => [...new Set([...(user.ownerOfProjects || []), ...(user.adminOfProjects || []), ...(user.teamMemberOfProjects || [])])].filter((id) => typeof id === "string" && /^[A-Za-z0-9_-]{1,150}$/.test(id)).slice(0, 300);
const isPublic = (project) => project.visibility === "Public" && project.archived !== true && PUBLIC_PROJECT_STATUSES.includes(project.status);
function cvEntries(cv) {
  const section = cv?.sections?.find((item) => item.section_type === "projects")?.content_json;
  return (Array.isArray(section?.projects) ? section.projects : []).slice(0, 100).filter((item) => item && typeof item === "object" && item.title).map((item) => ({ id: `cv_${createHash("sha256").update(JSON.stringify(item)).digest("hex")}`, title: String(item.title).slice(0, 160), date: null, kind: "portfolio", role: String(item.role || "").slice(0, 160) }));
}
const json = (value, status = 200) => Response.json(value, { status, headers: { "Cache-Control": "private, no-store" } });

export async function GET(request) {
  try {
    const viewer = await getRequestUser(request);
    const uid = new URL(request.url).searchParams.get("userId") || viewer?.uid;
    if (!uid || !/^[A-Za-z0-9:_-]{1,160}$/.test(uid)) return json({ error: "Account not found." }, 404);
    const owner = viewer?.uid === uid;
    const [user, cv, prefs] = await Promise.all([adminDb.collection("users").doc(uid).get(), adminDb.collection("go_cvs").doc(uid).get(), adminDb.collection("personal_project_timeline_preferences").doc(uid).get()]);
    if (!user.exists) return json({ error: "Account not found." }, 404);
    const visibleProfile = cv.exists ? cv.data().status === "active" && cv.data().visibility_public === true : user.data().profilePrivacy !== "private";
    if (!owner && !visibleProfile) return json({ error: "Timeline is private." }, 404);
    const publicIds = Array.isArray(prefs.data()?.publicProjectIds) ? prefs.data().publicProjectIds : [];
    const projects = await Promise.all(idsFor(user.data()).map((id) => adminDb.collection("projects").doc(id).get()));
    const entries = projects.filter((doc) => doc.exists && (owner || (publicIds.includes(doc.id) && isPublic(doc.data())))).map((doc) => {
      const project = doc.data(); const date = project.startDate || project.createdAt?.toDate?.()?.toISOString() || (typeof project.createdAt === "string" ? project.createdAt : null);
      return { id: doc.id, title: String(project.title || "Project").slice(0, 160), date, kind: "project", public: publicIds.includes(doc.id), eligibleForPublic: isPublic(project) };
    });
    if (cv.exists) entries.push(...cvEntries(cv.data()).filter((entry) => owner || publicIds.includes(entry.id)).map((entry) => ({ ...entry, public: publicIds.includes(entry.id), eligibleForPublic: cv.data().status === "active" && cv.data().visibility_public === true })));
    const enrollments = await adminDb.collection("learning_enrollments").where("userId", "==", uid).limit(100).get();
    const learning = await Promise.all(enrollments.docs.map(async (doc) => {
      const enrollment = doc.data();
      if (typeof enrollment.itemId !== "string" || !/^[A-Za-z0-9_-]{1,150}$/.test(enrollment.itemId)) return [];
      const item = await adminDb.collection("learning_items").doc(enrollment.itemId).get();
      if (!item.exists || item.data().isGameJam) return [];
      const eligibleForPublic = isPublicLearningStatus(item.data().status);
      const title = String(item.data().title || "GO learning activity").slice(0, 160);
      const date = enrollment.enrolledAt?.toDate?.()?.toISOString() || (typeof enrollment.enrolledAt === "string" ? enrollment.enrolledAt : null);
      const results = [{ id: `registration_${doc.id}`, title: `Registered: ${title}`, date, kind: "learning", eligibleForPublic }];
      if (enrollment.state === "attended") results.push({ id: `attendance_${doc.id}`, title: `Organizer-verified attendance: ${title}`, date: null, kind: "learning", eligibleForPublic });
      return results.filter((entry) => owner || (eligibleForPublic && publicIds.includes(entry.id))).map((entry) => ({ ...entry, public: publicIds.includes(entry.id) }));
    }));
    entries.push(...learning.flat());
    entries.sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
    return json({ entries });
  } catch { return json({ error: "Project timeline is temporarily unavailable." }, 503); }
}

export async function PATCH(request) {
  try {
    const user = await getRequestUser(request);
    if (!user) return json({ error: "Authentication required." }, 401);
    const body = await request.json(); const id = String(body.id || "");
    if (!/^[A-Za-z0-9_-]{1,150}$/.test(id) || typeof body.public !== "boolean") return json({ error: "Choose a project and visibility." }, 400);
    const userRef = adminDb.collection("users").doc(user.uid); const projectRef = adminDb.collection("projects").doc(id); const cvRef = adminDb.collection("go_cvs").doc(user.uid); const prefRef = adminDb.collection("personal_project_timeline_preferences").doc(user.uid);
    await adminDb.runTransaction(async (tx) => {
      const [account, project, cv, prefs] = await Promise.all([tx.get(userRef), tx.get(projectRef), tx.get(cvRef), tx.get(prefRef)]);
      const learningMatch = /^(registration|attendance)_([A-Za-z0-9_-]+)$/.exec(id);
      const enrollment = learningMatch ? await tx.get(adminDb.collection("learning_enrollments").doc(learningMatch[2])) : null;
      const itemId = enrollment?.data()?.itemId;
      const learningItem = typeof itemId === "string" && /^[A-Za-z0-9_-]{1,150}$/.test(itemId) ? await tx.get(adminDb.collection("learning_items").doc(itemId)) : null;
      const learning = enrollment?.exists && enrollment.data().userId === user.uid && learningItem?.exists && !learningItem.data().isGameJam && (learningMatch[1] !== "attendance" || enrollment.data().state === "attended");
      const portfolio = cv.exists && cvEntries(cv.data()).some((entry) => entry.id === id);
      if (!account.exists || (!learning && !portfolio && (!idsFor(account.data()).includes(id) || !project.exists))) throw Object.assign(new Error("Event not found."), { status: 404 });
      if (body.public && (learning ? !isPublicLearningStatus(learningItem.data().status) : portfolio ? cv.data().status !== "active" || cv.data().visibility_public !== true : !isPublic(project.data()))) throw Object.assign(new Error("Only publicly visible source records can be shared on your timeline."), { status: 400 });
      const current = Array.isArray(prefs.data()?.publicProjectIds) ? prefs.data().publicProjectIds : [];
      const publicProjectIds = body.public ? [...new Set([...current, id])] : current.filter((value) => value !== id);
      tx.set(prefRef, { publicProjectIds, updatedAt: new Date() }, { merge: true });
    });
    return json({ ok: true });
  } catch (error) { return json({ error: error.status ? error.message : "Visibility could not be updated." }, error.status || 503); }
}

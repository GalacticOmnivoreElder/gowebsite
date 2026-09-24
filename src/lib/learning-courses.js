import { bootcampCourse, firstBootcampCohort } from "@/content/idea-to-playable";

export const COURSE_COMPETENCIES = ["scope", "build", "debug", "version", "ship"];
export const COURSE_ACCESS_STATES = ["confirmed", "attended", "did_not_attend", "completed"];
const text = (value, max = 12000) => String(value || "").trim().slice(0, max);
export function courseError(message, status = 400) { return Object.assign(new Error(message), { status, code: "validation_error" }); }
export function courseUrl(value, { itch = false } = {}) {
  if (!value) return "";
  try {
    const url = new URL(String(value));
    if (url.protocol !== "https:" || url.username || url.password || (itch && !(url.hostname === "itch.io" || url.hostname.endsWith(".itch.io")))) throw new Error();
    return url.href;
  } catch { throw courseError(itch ? "Use a valid HTTPS itch.io URL" : "Use a valid HTTPS URL"); }
}
export function cleanCourseModules(modules) {
  if (!Array.isArray(modules) || modules.length !== 5) throw courseError("Exactly five course days are required");
  return modules.map((module, index) => ({ id: `day-${index + 1}`, title: text(module.title, 200), theme: text(module.theme, 500), milestone: text(module.milestone, 50), content: text(module.content) }));
}
export function cleanCourseResources(resources = []) {
  if (!Array.isArray(resources) || resources.length > 100) throw courseError("Use up to 100 resources");
  const result = resources.map((resource, index) => ({
    id: text(resource.id || `resource-${index + 1}`, 100), title: text(resource.title, 200),
    day: Math.min(5, Math.max(0, Number(resource.day) || 0)),
    kind: ["guide", "prompt", "qa", "repository", "recording", "slides", "homework", "download", "example"].includes(resource.kind) ? resource.kind : "guide",
    url: courseUrl(resource.url), approved: resource.approved === true,
  }));
  if (result.some(r => !r.title || !r.url) || new Set(result.map(r => r.id)).size !== result.length) throw courseError("Resources need unique IDs, a title and a URL");
  return result;
}
export function cleanCourse(input) {
  const result = { id: bootcampCourse.id, slug: bootcampCourse.slug, status: input.status === "draft" ? "draft" : "published", priceStatus: "coming_soon", memberAccess: input.memberAccess !== false, reviewMinimum: 10, curriculumVersion: Math.max(1, Math.floor(Number(input.curriculumVersion) || 1)) };
  for (const field of ["title", "subtitle", "promise", "description", "audience", "outcomes", "tools", "methodology", "aiRule", "expectations", "badgeTitle", "qaTemplate"]) result[field] = text(input[field]);
  if (!result.title || !result.description) throw courseError("Course title and description are required");
  result.imageUrl = courseUrl(input.imageUrl);
  result.modules = cleanCourseModules(input.modules);
  result.resources = cleanCourseResources(input.resources);
  result.faq = (Array.isArray(input.faq) ? input.faq : []).slice(0, 20).map(f => ({ question: text(f.question, 300), answer: text(f.answer, 3000) }));
  return result;
}
export function publicCourse(course) { return { ...course, resources: (course.resources || []).filter(r => r.approved).map(({ url, ...resource }) => resource) }; }
export function cleanCourseSessions(sessions = []) {
  if (!Array.isArray(sessions) || sessions.length !== 5) throw courseError("A cohort needs five sessions");
  return sessions.map((session, index) => {
    const start = new Date(session.startsAt), end = new Date(session.endsAt);
    if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end <= start) throw courseError("Session dates must be valid and end after their start");
    return { id: `day-${index + 1}`, title: text(session.title, 200), startsAt: start.toISOString(), endsAt: end.toISOString(), privateSessionUrl: courseUrl(session.privateSessionUrl) };
  });
}
export function cleanCourseSubmission(input) {
  return { completedDays: [...new Set((Array.isArray(input.completedDays) ? input.completedDays : []).filter(d => Number.isInteger(d) && d >= 1 && d <= 5))],
    prototypePublished: input.prototypePublished === true, finalUrl: courseUrl(input.finalUrl, { itch: true }),
    reviewEvidenceUrl: courseUrl(input.reviewEvidenceUrl), playtestNotes: text(input.playtestNotes, 5000), retrospective: text(input.retrospective, 5000) };
}
export function cleanCourseAssessment(input, submission = {}) {
  const reviewCount = Number(input.reviewCount);
  if (!Number.isInteger(reviewCount) || reviewCount < 0) throw courseError("Enter the human-verified number of reviews/ratings");
  const competencies = Object.fromEntries(COURSE_COMPETENCIES.map(key => [key, input.competencies?.[key] === true]));
  const approved = input.approved === true;
  if (approved && (!submission.prototypePublished || !courseUrl(submission.finalUrl, { itch: true }) || reviewCount < 10 || !input.evidenceVerified || !COURSE_COMPETENCIES.every(key => competencies[key]))) throw courseError("Approval requires a published itch.io prototype, 10 verified reviews/ratings and all five competencies");
  return { approved, reviewCount, evidenceVerified: input.evidenceVerified === true, competencies, notes: text(input.notes, 3000) };
}
export function courseSeatCount(item) { return Math.max(0, (Number(item.confirmedCount) || 0) - (item.capacityMode === "in_person" ? Number(item.onlineConfirmedCount) || 0 : 0)); }
export function courseUsesSeat(item, enrollment) { return !(item.capacityMode === "in_person" && enrollment.attendanceMode === "online"); }
export { bootcampCourse, firstBootcampCohort };

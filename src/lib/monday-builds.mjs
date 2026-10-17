export const BUILD_TIMEZONE = "Europe/Warsaw";
export function problem(message, status = 400) { return Object.assign(new Error(message), { status }); }
const dateText = (date) => date.toISOString().slice(0, 10);
export function shiftDate(key, days) {
  const date = new Date(key + "T12:00:00Z");
  date.setUTCDate(date.getUTCDate() + days);
  return dateText(date);
}
function localParts(date) {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: BUILD_TIMEZONE, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).formatToParts(date);
  return Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, Number(part.value)]));
}
function wallTime(key, hour) {
  const target = Date.parse(key + "T" + String(hour).padStart(2, "0") + ":00:00Z");
  let guess = target;
  for (let i = 0; i < 3; i++) {
    const p = localParts(new Date(guess));
    const actual = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
    guess += target - actual;
  }
  return new Date(guess).toISOString();
}
export function periodForKey(key) {
  if (!/^20\d{2}-\d{2}-\d{2}$/.test(key || "")) throw problem("A Monday cycle date is required");
  const day = new Date(key + "T12:00:00Z");
  if (!Number.isFinite(day.getTime()) || dateText(day) !== key || day.getUTCDay() !== 1) throw problem("Cycle date must be a valid Monday");
  const buildDate = shiftDate(key, 7);
  return { key, opensAt: wallTime(key, 8), closesAt: wallTime(buildDate, 7), buildEndsAt: wallTime(buildDate, 8), buildDate, timezone: BUILD_TIMEZONE };
}
export function currentBuildPeriod(now = new Date()) {
  const date = new Date(now);
  if (!Number.isFinite(date.getTime())) throw problem("Invalid date");
  const p = localParts(date);
  const key = p.year + "-" + String(p.month).padStart(2, "0") + "-" + String(p.day).padStart(2, "0");
  const weekday = new Date(key + "T12:00:00Z").getUTCDay();
  let monday = shiftDate(key, -((weekday + 6) % 7));
  if (weekday === 1 && p.hour < 8) monday = shiftDate(monday, -7);
  const period = periodForKey(monday);
  return { ...period, votingOpen: date >= new Date(period.opensAt) && date < new Date(period.closesAt), inBuildSession: date >= new Date(period.closesAt) && date < new Date(period.buildEndsAt) };
}
export function officiallyPublishedPack(pack = {}) {
  return pack.status === "published" && typeof pack.currentVersionId === "string" && Boolean(pack.currentVersionId) && Boolean(pack.lastReviewedBy) && Boolean(pack.publishedAt);
}
export function votingEligibility(activeMember, packs = []) {
  if (!activeMember) return { eligible: false, reason: "Join or renew GO Community membership to use weekly feature voting." };
  if (!packs.some(officiallyPublishedPack)) return { eligible: false, reason: "Publish an original asset pack through GO's review process to unlock your weekly vote." };
  return { eligible: true, reason: null };
}
export function cleanCandidates(input) {
  if (!Array.isArray(input) || input.length < 2 || input.length > 8) throw problem("Provide between two and eight build candidates");
  const seen = new Set();
  return input.map((item, index) => {
    const title = String(item?.title || "").trim();
    if (!title || title.length > 120 || seen.has(title.toLowerCase())) throw problem("Each candidate needs a unique title of 120 characters or fewer");
    seen.add(title.toLowerCase());
    return { id: "option-" + (index + 1), title, description: String(item.description || "").trim().slice(0, 600), votes: 0 };
  });
}
export function publicPoll(id, data = {}) {
  return { id, options: (data.options || []).map(({ id, title, description, votes }) => ({ id, title, description, votes: Number.isSafeInteger(votes) && votes >= 0 ? votes : 0 })), totalVotes: Number.isSafeInteger(data.totalVotes) && data.totalVotes >= 0 ? data.totalVotes : 0, outcome: data.outcome ? { optionId: data.outcome.optionId, status: data.outcome.status, note: data.outcome.note, link: data.outcome.link || null } : null };
}
export function spritePath(value) {
  return /^\/stamps\/[a-zA-Z0-9_/-]+\.png$/.test(value || "") && value.length <= 180 ? value : null;
}
export function publicStamp(id, data = {}) {
  const date = data.issuedAt?.toDate?.() || new Date(data.issuedAt);
  return { id, title: String(data.title || "Official GO stamp").slice(0, 120), kind: data.kind, issuedAt: Number.isFinite(date.getTime()) ? date.toISOString() : null, sourceTitle: String(data.sourceTitle || "").slice(0, 160), spritePath: spritePath(data.spritePath) };
}


export function passportIsVisible({ owner = false, hasCv = false, publicCv = false, profilePrivacy } = {}) {
  if (owner) return true;
  return hasCv ? publicCv === true : profilePrivacy === "public";
}
export async function visiblePassport(read, uid, visibility) {
  if (!passportIsVisible(visibility)) return null;
  return read(uid);
}

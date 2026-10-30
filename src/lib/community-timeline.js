export const TIMELINE_CATEGORIES = ["milestone", "event", "project", "partnership", "organization", "initiative"];
export const TIMELINE_STATES = ["completed", "in progress", "confirmed plan", "proposal"];

export function cleanTimelineEntry(input) {
  const text = (value, max) => String(value || "").trim().slice(0, max);
  const title = text(input.title, 160);
  const description = text(input.description, 4000);
  const date = text(input.date, 10);
  const category = text(input.category, 40);
  const state = text(input.state, 40);
  if (!title || !description || !/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00Z`)) || new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) !== date || !TIMELINE_CATEGORIES.includes(category) || !TIMELINE_STATES.includes(state)) throw new Error("Provide a title, description, valid date, category and state.");
  const url = (value) => {
    const result = text(value, 1000);
    if (!result) return "";
    try { if (!["https:", "http:"].includes(new URL(result).protocol)) throw new Error(); } catch { throw new Error("Links must use http or https."); }
    return result;
  };
  const source = url(input.source);
  const image = url(input.image);
  const imageAlt = text(input.imageAlt, 240);
  if (image && !imageAlt) throw new Error("Provide image alternative text.");
  const published = input.published === true;
  if (published && state === "completed" && !source) throw new Error("Published completed history requires a source link.");
  return { title, description, date, category, state, organization: text(input.organization, 160), relationship: text(input.relationship, 500), project: text(input.project, 160), image, imageAlt, link: url(input.link), source, published };
}

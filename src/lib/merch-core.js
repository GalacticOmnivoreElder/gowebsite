import { z } from "zod";

export const MERCH_PRODUCTS = [
  { id: "tshirt", name: "GO T-shirt", apparel: true },
  { id: "hoodie", name: "GO Hoodie", apparel: true },
  { id: "tote", name: "GO Tote bag", apparel: false },
  { id: "stickers", name: "GO Sticker pack", apparel: false },
];
export const MERCH_SIZES = ["unsure", "XS", "S", "M", "L", "XL", "XXL"];
export const MERCH_CONSENT = "Email me about availability and next steps for the GO merchandise I request. I can stop these updates at any time.";
const text = (max) => z.string().trim().max(max);
export const merchRequestSchema = z.object({
  email: text(254).email().transform((value) => value.toLowerCase()),
  name: text(80).default(""),
  location: z.enum(["skopje", "macedonia", "international"]),
  city: text(100).default(""), country: text(100).default(""),
  fulfillment: z.enum(["undecided", "pickup", "kiimo", "cargo"]),
  consent: z.literal(true),
  lines: z.array(z.object({ productId: z.enum(["tshirt", "hoodie", "tote", "stickers"]), size: z.enum(MERCH_SIZES).default("unsure"), quantity: z.number().int().min(1).max(10) })).min(1).max(24),
}).superRefine((value, context) => {
  const issue = (message) => context.addIssue({ code: "custom", message });
  if (value.location !== "skopje" && !value.city) issue("Enter your city.");
  if (value.location === "international" && !value.country) issue("Enter your country.");
  if (value.fulfillment === "kiimo" && value.location !== "skopje") issue("Kiimo delivery is available within Skopje only.");
  const totals = new Map();
  for (const line of value.lines) {
    if (!["tshirt", "hoodie"].includes(line.productId) && line.size !== "unsure") issue("This item does not have clothing sizes.");
    const key = `${line.productId}:${line.size}`;
    totals.set(key, (totals.get(key) || 0) + line.quantity);
  }
  if ([...totals.values()].some((quantity) => quantity > 10)) issue("Request at most 10 units per item and size.");
}).transform((value) => {
  const lines = new Map();
  value.lines.forEach((line) => {
    const key = `${line.productId}:${line.size}`;
    lines.set(key, { ...line, quantity: line.quantity + (lines.get(key)?.quantity || 0) });
  });
  return { ...value, city: value.location === "skopje" ? "Skopje" : value.city, country: value.location === "international" ? value.country : "North Macedonia", lines: [...lines.values()] };
});
export const suggestionSchema = z.object({ title: text(120).min(2), details: text(1000).default("") });
export const availabilitySchema = z.object({
  productId: z.enum(["tshirt", "hoodie", "tote", "stickers"]),
  sizes: z.array(z.enum(MERCH_SIZES)).min(1).max(7),
  location: z.enum(["skopje", "macedonia", "international", "all"]),
  details: text(2000).min(20),
});
export function matchesAvailability(request, batch) {
  return request?.status === "confirmed" && request.active?.consent === true &&
    (batch.location === "all" || request.active.location === batch.location) &&
    request.active.lines.some((line) => line.productId === batch.productId && batch.sizes.includes(line.size));
}
export function summarizeMerch(requests) {
  const summary = { people: 0, units: 0, pending: 0, variants: {} };
  for (const request of requests) {
    if (request.pending) summary.pending++;
    if (request.status !== "confirmed" || !request.active) continue;
    summary.people++;
    for (const line of request.active.lines) {
      summary.units += line.quantity;
      const key = `${line.productId} / ${line.size} / ${request.active.city} / ${request.active.fulfillment}`;
      const row = summary.variants[key] || { people: 0, units: 0 };
      row.people++; row.units += line.quantity; summary.variants[key] = row;
    }
  }
  return summary;
}

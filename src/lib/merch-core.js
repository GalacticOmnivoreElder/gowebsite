import { z } from "zod";
import { MERCH_DESIGNS, MERCH_OFFERS, getReservationItems } from "./merch-catalog";

export { MERCH_DESIGNS } from "./merch-catalog";

export const MERCH_PRODUCTS = [{ id: "tshirt", name: "GO T-shirt", apparel: true }];
export const MERCH_SIZES = ["XS", "S", "M", "L", "XL", "XXL"];
export const MERCH_AVAILABILITY_SIZES = ["unsure", ...MERCH_SIZES];
export const MERCH_CONSENT = "I agree GO may use my email and phone to manage this T-shirt reservation and contact me about fulfilment.";
export const MERCH_LEGACY_CONSENT = "Email me about availability and next steps for the GO merchandise I request. I can stop these updates at any time.";

const text = (max) => z.string().trim().max(max);
const phone = text(32).regex(/^[+\d][\d\s()+.-]{6,31}$/, "Enter a valid phone number.");

const shirtChoiceSchema = z.object({
  design: z.enum(MERCH_DESIGNS.map((design) => design.id)),
  size: z.enum(MERCH_SIZES),
  fit: z.enum(["male", "female"]),
});
const reservationBaseSchema = z.object({
  submissionId: z.string().uuid(),
  email: text(254).email().transform((value) => value.toLowerCase()),
  phone,
  quantity: z.number().int().min(1).max(10),
  proposedTotalPrice: z.number().int().min(1).max(1000000),
  location: z.enum(["skopje", "north_macedonia"]),
  city: text(100).default(""),
  fulfillment: z.enum(["pickup", "delivery"]),
  address: text(300).default(""),
  consent: z.literal(true),
  company: text(120).optional(),
});

export const merchReservationSchema = z.union([
  reservationBaseSchema.extend({ offerId: z.enum(["single", "duo"]), items: z.array(shirtChoiceSchema).min(1).max(2) }),
  reservationBaseSchema.merge(shirtChoiceSchema).transform(({ design, size, fit, ...value }) => ({ ...value, offerId: "single", items: [{ design, size, fit }] })),
]).superRefine((value, context) => {
  const issue = (path, message) => context.addIssue({ code: "custom", path: [path], message });
  const offer = MERCH_OFFERS.find((offer) => offer.id === value.offerId);
  if (value.items.length !== offer.shirtCount) issue("items", `Choose ${offer.shirtCount} T-shirt${offer.shirtCount === 1 ? "" : "s"} for this offer.`);
  if (value.quantity * offer.shirtCount > 10) issue("quantity", "Reserve at most 10 T-shirts in total.");
  if (value.location === "north_macedonia" && !value.city) issue("city", "Enter your city.");
  if (value.location === "skopje" && value.fulfillment === "pickup" && value.address) issue("address", "An address is not needed for office pickup.");
  if (value.fulfillment === "pickup" && value.location !== "skopje") issue("fulfillment", "Office pickup is available in Skopje.");
  if (value.fulfillment === "delivery" && !value.address) issue("address", "Enter the delivery address.");
}).transform((value) => ({
  ...value,
  city: value.location === "skopje" ? "Skopje" : value.city,
  deliveryMethod: value.fulfillment === "pickup" ? "pickup" : value.location === "skopje" ? "kiimo" : "cargo",
}));

export function createMerchReservation(data) {
  const offer = MERCH_OFFERS.find((offer) => offer.id === data.offerId);
  const items = data.items.map((item) => ({
    ...item,
    productId: "tshirt",
    variantId: `${item.design}-${item.fit}`,
    designName: MERCH_DESIGNS.find((design) => design.id === item.design).name,
    quantity: data.quantity,
  }));
  return {
    productId: "tshirt", offerId: offer.id, offerName: offer.name,
    packageQuantity: data.quantity, quantity: data.quantity * offer.shirtCount,
    items, pricingMode: "customer_proposed", proposedTotalPrice: data.proposedTotalPrice, currency: "MKD",
    location: data.location === "skopje" ? "skopje" : "macedonia",
    city: data.city, fulfillment: data.deliveryMethod,
    address: data.fulfillment === "delivery" ? data.address : "",
  };
}

export const suggestionSchema = z.object({ title: text(120).min(2), details: text(1000).default("") });

export function merchRequestExpiry({ confirmed = false, previousExpiry = null, now = Date.now() } = {}) {
  if (confirmed) return new Date(now + 365 * 24 * 60 * 60 * 1000);
  const previous = previousExpiry?.toDate?.() || previousExpiry;
  const previousTime = previous ? new Date(previous).getTime() : 0;
  return new Date(Math.max(Number.isFinite(previousTime) ? previousTime : 0, now + 30 * 24 * 60 * 60 * 1000));
}

export const availabilitySchema = z.object({
  productId: z.literal("tshirt"),
  design: z.enum(["all", ...MERCH_DESIGNS.map((item) => item.id)]).default("all"),
  offerId: z.enum(["all", "single", "duo"]).default("all"),
  sizes: z.array(z.enum(MERCH_AVAILABILITY_SIZES)).min(1).max(MERCH_AVAILABILITY_SIZES.length),
  location: z.enum(["skopje", "macedonia", "all"]),
  details: text(2000).min(20),
  checkoutUrl: z.union([z.literal(""), z.string().trim().max(2083).url().refine((value) => {
    try {
      const url = new URL(value);
      return url.protocol === "https:" && !url.username && !url.password;
    } catch { return false; }
  }, "Use a secure checkout URL.")]).default(""),
}).superRefine((value, context) => {
  if (value.checkoutUrl && value.offerId === "all") context.addIssue({ code: "custom", path: ["offerId"], message: "Choose the specific offer sold at this checkout link." });
});

export function matchesAvailability(request, batch) {
  const reservation = request?.reservation;
  const legacy = request?.active;
  const optedIn = request?.status === "reserved"
    ? request.consent?.version === "merch-v2"
    : request?.status === "confirmed" && request.consent?.text && request.consent?.version === "merch-v1";
  if (!optedIn) return false;

  const location = reservation?.location || legacy?.location;
  if (batch.location !== "all" && location !== batch.location) return false;

  if (reservation) {
    if (batch.offerId && batch.offerId !== "all" && (reservation.offerId || "single") !== batch.offerId) return false;
    const items = getReservationItems(reservation);
    return batch.productId === "tshirt" && items.length > 0 && items.every((item) => batch.sizes.includes(item.size) &&
      (!batch.design || batch.design === "all" || batch.design === item.design));
  }
  if (batch.offerId === "duo") return false;
  return legacy?.lines?.some((line) => line.productId === batch.productId && batch.sizes.includes(line.size)) === true;
}

export function summarizeMerch(requests) {
  const summary = { people: 0, units: 0, pending: 0, variants: {} };
  for (const request of requests) {
    if (request.pending) summary.pending++;
    const reservation = request.status === "reserved" ? request.reservation : null;
    if (reservation) {
      summary.people++;
      const requested = new Map();
      for (const item of getReservationItems(reservation)) {
        summary.units += item.quantity;
        const design = item.designName || MERCH_DESIGNS.find((design) => design.id === item.design)?.name || item.design;
        const key = `${design} / ${item.size} / ${item.fit} / ${reservation.city} / ${reservation.fulfillment}`;
        requested.set(key, (requested.get(key) || 0) + item.quantity);
      }
      for (const [key, units] of requested) {
        const row = summary.variants[key] || { people: 0, units: 0 };
        row.people++; row.units += units; summary.variants[key] = row;
      }
      continue;
    }
    if (request.status !== "confirmed" || !request.active) continue;
    summary.people++;
    for (const line of request.active.lines || []) {
      summary.units += line.quantity;
      const key = `${line.productId} / ${line.size} / ${request.active.city} / ${request.active.fulfillment}`;
      const row = summary.variants[key] || { people: 0, units: 0 };
      row.people++; row.units += line.quantity; summary.variants[key] = row;
    }
  }
  return summary;
}

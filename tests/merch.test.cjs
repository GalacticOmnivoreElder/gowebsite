const { test } = require("node:test");
const assert = require("node:assert/strict");
const { z } = require("zod");
const { loadSourceModule: load } = require("./helpers/load-source-module.cjs");

const catalog = load("src/lib/merch-catalog.js", ["MERCH_DESIGNS", "MERCH_OFFERS", "getReservationItems", "describeMerchItem"]);
function core() {
  return load("src/lib/merch-core.js", ["merchReservationSchema", "createMerchReservation", "merchRequestExpiry", "matchesAvailability", "summarizeMerch", "availabilitySchema"], {
    stripImports: true,
    transform: (source) => source.replace(/^export \{.*\} from .*;\r?\n/gm, ""),
    sandbox: { z, ...catalog },
  });
}
const api = core();
const shirt = { design: "main", fit: "male", size: "L" };
const second = { design: "alternate", fit: "female", size: "XS" };
const input = (patch = {}) => ({ submissionId: "a04689ed-443a-49e2-91b4-44a987007075", email: "Person@example.com", phone: "+38970000000", offerId: "duo", items: [shirt, second], quantity: 2, proposedTotalPrice: 2300, location: "skopje", fulfillment: "pickup", consent: true, ...patch });
const reserved = (reservation) => ({ status: "reserved", consent: { version: "merch-v2" }, reservation });

test("one TTL field supports pending and confirmed request retention", () => {
  const now = Date.parse("2026-10-23T12:00:00Z");
  const pending = api.merchRequestExpiry({ now });
  const confirmed = api.merchRequestExpiry({ now, confirmed: true });
  assert.equal(pending.getTime() - now, 30 * 86400000);
  assert.equal(confirmed.getTime() - now, 365 * 86400000);
  assert.equal(api.merchRequestExpiry({ now: now + 86400000, previousExpiry: { toDate: () => confirmed } }).getTime(), confirmed.getTime());
  assert.equal(api.merchRequestExpiry({ now, previousExpiry: new Date(now - 86400000) }).getTime(), pending.getTime());
  const fields = require("../firestore.indexes.json").fieldOverrides.filter((field) => field.collectionGroup === "merch_requests" && field.ttl);
  assert.equal(fields.length, 1);
  assert.equal(fields[0].fieldPath, "pendingExpiresAt");
});

test("mixed packages retain both choices and the customer's proposed total", () => {
  const data = api.merchReservationSchema.parse(input({ totalPrice: 1, unitPrice: 1 }));
  const reservation = api.createMerchReservation(data);
  assert.equal(reservation.packageQuantity, 2);
  assert.equal(reservation.quantity, 4);
  assert.equal(reservation.proposedTotalPrice, 2300);
  assert.equal(reservation.pricingMode, "customer_proposed");
  assert.equal(reservation.currency, "MKD");
  assert.equal(reservation.totalPrice, undefined);
  assert.equal(reservation.unitPrice, undefined);
  assert.equal(reservation.items[0].variantId, "main-male");
  assert.equal(reservation.items[1].variantId, "alternate-female");
  assert.equal(reservation.items[1].size, "XS");
  assert.equal(reservation.items[1].quantity, 2);
});

test("offer counts, quantity limits, delivery details and proposed prices are enforced", () => {
  for (const patch of [{ items: [shirt] }, { quantity: 6 }, { quantity: 1.5 }, { fulfillment: "delivery" }, { location: "north_macedonia", city: "Bitola" }]) {
    assert.equal(api.merchReservationSchema.safeParse(input(patch)).success, false);
  }
  for (const proposedTotalPrice of [undefined, 0, -1, 1.5, "2000", Infinity, 1000001]) {
    assert.equal(api.merchReservationSchema.safeParse(input({ proposedTotalPrice })).success, false);
  }
  const delivery = api.merchReservationSchema.parse(input({ location: "north_macedonia", city: "Bitola", fulfillment: "delivery", address: "Example street 1" }));
  assert.equal(delivery.deliveryMethod, "cargo");
});

test("single-shirt requests accept proposed totals and old stored reservations remain readable", () => {
  const { items, offerId, ...oldInput } = input({ quantity: 3 });
  const parsed = api.merchReservationSchema.parse({ ...oldInput, ...items[0] });
  assert.equal(parsed.offerId, "single");
  assert.equal(api.createMerchReservation(parsed).proposedTotalPrice, 2300);
  const oldReservation = { ...shirt, quantity: 3, city: "Skopje", fulfillment: "pickup", location: "skopje" };
  assert.equal(api.summarizeMerch([reserved(oldReservation)]).units, 3);
});

test("bundle availability requires every selected shirt and the matching offer", () => {
  const request = reserved(api.createMerchReservation(api.merchReservationSchema.parse(input())));
  const batch = { productId: "tshirt", offerId: "duo", design: "all", sizes: ["L", "XS"], location: "all" };
  assert.equal(api.matchesAvailability(request, batch), true);
  for (const patch of [{ sizes: ["L"] }, { design: "main" }, { offerId: "single" }]) assert.equal(api.matchesAvailability(request, { ...batch, ...patch }), false);
  assert.equal(api.matchesAvailability({ ...request, status: "pending" }, batch), false);
});

test("two identical shirts count as two units but one person per demand row", () => {
  const reservation = api.createMerchReservation(api.merchReservationSchema.parse(input({ items: [shirt, shirt] })));
  const summary = api.summarizeMerch([reserved(reservation)]);
  assert.equal(summary.people, 1);
  assert.equal(summary.units, 4);
  assert.equal(Object.values(summary.variants)[0].people, 1);
  assert.equal(Object.values(summary.variants)[0].units, 4);
});

test("confirmation email identifies the proposed price and includes both shirt choices", () => {
  const { eventCopy } = load("src/lib/email/templates/events.js", ["eventCopy"], {
    stripImports: true,
    sandbox: { ...catalog, escapeHtml: (value) => String(value ?? ""), absoluteSiteUrl: (path) => `https://example.invalid${path}`, firestoreDateToDate: () => null },
  });
  const reservation = api.createMerchReservation(api.merchReservationSchema.parse(input()));
  const email = eventCopy("merch.reservation_received", { reservation });
  assert.match(email.text, /suggested total.*2,300 MKD/);
  assert.match(email.text, /not a confirmed purchase price/);
  assert.match(email.text, /Main · Black · Male · L/);
  assert.match(email.text, /Alternate · White · Female · XS/);
  assert.doesNotMatch(email.text, /1,500|Package price:/);
});

test("checkout links accept HTTPS and reject executable or credential-bearing URLs", () => {
  const batch = { productId: "tshirt", offerId: "single", sizes: ["L"], location: "all", details: "Stock is available. Select your reserved shirts at checkout." };
  for (const checkoutUrl of ["", "https://checkout.example.com/tshirts"]) assert.equal(api.availabilitySchema.safeParse({ ...batch, checkoutUrl }).success, true);
  for (const checkoutUrl of ["invalid", "javascript:alert(1)", "http://checkout.example.com", "https://user:password@checkout.example.com"]) assert.equal(api.availabilitySchema.safeParse({ ...batch, checkoutUrl }).success, false);
  assert.equal(api.availabilitySchema.safeParse({ ...batch, offerId: "all", checkoutUrl: "https://checkout.example.com" }).success, false);
});

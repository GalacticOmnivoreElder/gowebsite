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

function adminRoute() {
  const { createHash, randomUUID } = require("node:crypto");
  const records = new Map();
  const sent = [];
  const context = { user: { uid: "admin-fixture", email: "admin@example.com", admin: true, claims: { email_verified: true } } };
  const reservation = api.createMerchReservation(api.merchReservationSchema.parse(input()));
  const snapshot = (id) => ({ exists: records.has(id), data: () => records.get(id) });
  const adminDb = {
    collection(name) {
      if (name === "merch_batches") return { doc: (id) => ({ id, get: async () => snapshot(id) }) };
      assert.equal(name, "merch_requests");
      return { orderBy: () => ({ limit: () => ({ get: async () => ({ size: 1, docs: [{ id: "request", data: () => reserved(reservation) }] }) }) }) };
    },
    async runTransaction(fn) { return fn({ get: async (ref) => snapshot(ref.id), create: (ref, data) => records.set(ref.id, data) }); },
  };
  const route = load("src/app/api/admin/merch/route.js", ["POST"], { stripImports: true, sandbox: {
    ...api, ...catalog, adminDb, randomUUID,
    NextResponse: require("./helpers/route-test-utils.cjs").NextResponse,
    getRequestUser: async () => context.user,
    readMerchBody: async (request) => request.body,
    merchError: (message, status = 400) => Object.assign(new Error(message), { status }),
    requireMerchEmail: () => {}, hashValue: (value) => createHash("sha256").update(value).digest("hex"),
    sendEmailJob: async (job) => { sent.push(job); return { status: "sent" }; },
  } });
  return { post: (body) => route.POST({ body }), records, sent, context };
}

test("admin preview explains the exact checkout/offer conflict and accepts corrected inputs", async () => {
  const admin = adminRoute();
  const body = { action: "prepare", productId: "tshirt", offerId: "all", design: "all", sizes: ["XS", "L"], location: "skopje", details: "T-shirts are ready. Review your selected shirts at checkout.", checkoutUrl: "https://checkout.example.com/shirts" };
  const invalid = await admin.post(body);
  assert.equal(invalid.status, 400);
  assert.match(invalid.body.error, /select One T-shirt or Any two T-shirts/);
  assert.equal(invalid.body.fieldErrors.offerId.length, 1);
  assert.equal(admin.records.size, 0);
  const corrected = await admin.post({ ...body, offerId: "duo" });
  assert.equal(corrected.status, 200);
  assert.equal(corrected.body.count, 1);
  assert.equal(corrected.body.checkoutUrl, body.checkoutUrl);
  assert.equal((await admin.post({ ...body, checkoutUrl: "" })).status, 200);
});

test("each admin test click sends only to the verified admin with a fresh delivery key", async () => {
  const admin = adminRoute();
  const prepared = await admin.post({ action: "prepare", productId: "tshirt", sizes: ["L"], location: "all", details: "This is a controlled email delivery test." });
  for (let i = 0; i < 2; i++) assert.equal((await admin.post({ action: "test", id: prepared.body.id })).status, 200);
  assert.equal(admin.sent.length, 2);
  assert.equal(admin.sent[0].recipient, "admin@example.com");
  assert.notEqual(admin.sent[0].idempotencyKey, admin.sent[1].idempotencyKey);
  admin.context.user.claims.email_verified = false;
  const unverified = await admin.post({ action: "test", id: prepared.body.id });
  assert.equal(unverified.status, 400);
  assert.match(unverified.body.error, /Verify your admin account/);
  assert.equal(admin.sent.length, 2);
  admin.context.user.admin = false;
  assert.equal((await admin.post({ action: "test", id: prepared.body.id })).status, 403);
});

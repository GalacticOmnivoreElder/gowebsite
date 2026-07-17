const assert = require("node:assert/strict");
const test = require("node:test");
const { loadSourceModule } = require("../helpers/load-source-module.cjs");

const {
  getPolarApiBase,
  getPolarPortalBase,
  getPolarServer,
  resolvePolarProductId,
  resolvePolarProductTier,
} = loadSourceModule("src/lib/polar.js", [
  "getPolarApiBase",
  "getPolarPortalBase",
  "getPolarServer",
  "resolvePolarProductId",
  "resolvePolarProductTier",
]);

const polarEnvKeys = [
  "POLAR_SERVER",
  "POLAR_ORGANIZATION_SLUG",
  "NEXT_PUBLIC_POLAR_PRODUCT_ID",
  "NEXT_PUBLIC_POLAR_COMPANY_PRODUCT_ID",
  "NEXT_PUBLIC_POLAR_MEMBER_MONTHLY_PRODUCT_ID",
  "NEXT_PUBLIC_POLAR_MEMBER_ANNUAL_PRODUCT_ID",
  "NEXT_PUBLIC_POLAR_COMPANY_MONTHLY_PRODUCT_ID",
  "NEXT_PUBLIC_POLAR_COMPANY_ANNUAL_PRODUCT_ID",
];

function withEnv(values, fn) {
  const original = {};
  for (const key of polarEnvKeys) {
    original[key] = process.env[key];
    delete process.env[key];
  }

  Object.assign(process.env, values);
  try {
    return fn();
  } finally {
    for (const key of polarEnvKeys) {
      if (original[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = original[key];
      }
    }
  }
}

test("Polar defaults to sandbox unless production is explicit", () => {
  withEnv({}, () => {
    assert.equal(getPolarServer(), "sandbox");
    assert.equal(getPolarApiBase(), "https://sandbox-api.polar.sh/v1");
  });

  withEnv({ POLAR_SERVER: "production" }, () => {
    assert.equal(getPolarServer(), "production");
    assert.equal(getPolarApiBase(), "https://api.polar.sh/v1");
  });
});

test("resolvePolarProductId maps tier and interval to the correct env var", () => {
  withEnv(
    {
      NEXT_PUBLIC_POLAR_MEMBER_MONTHLY_PRODUCT_ID: "member-monthly",
      NEXT_PUBLIC_POLAR_MEMBER_ANNUAL_PRODUCT_ID: "member-annual",
      NEXT_PUBLIC_POLAR_COMPANY_MONTHLY_PRODUCT_ID: "company-monthly",
      NEXT_PUBLIC_POLAR_COMPANY_ANNUAL_PRODUCT_ID: "company-annual",
    },
    () => {
      assert.equal(resolvePolarProductId("member", "monthly"), "member-monthly");
      assert.equal(resolvePolarProductId("member", "annual"), "member-annual");
      assert.equal(resolvePolarProductId("company", "monthly"), "company-monthly");
      assert.equal(resolvePolarProductId("company", "annual"), "company-annual");
    }
  );
});

test("resolvePolarProductId keeps legacy monthly product fallbacks", () => {
  withEnv(
    {
      NEXT_PUBLIC_POLAR_PRODUCT_ID: "legacy-member",
      NEXT_PUBLIC_POLAR_COMPANY_PRODUCT_ID: "legacy-company",
    },
    () => {
      assert.equal(resolvePolarProductId("member", "monthly"), "legacy-member");
      assert.equal(resolvePolarProductId("company", "monthly"), "legacy-company");
      assert.equal(resolvePolarProductId("member", "annual"), null);
      assert.equal(resolvePolarProductId("company", "annual"), null);
    }
  );
});

test("resolvePolarProductId normalizes unknown input to member monthly", () => {
  withEnv({ NEXT_PUBLIC_POLAR_MEMBER_MONTHLY_PRODUCT_ID: "member-monthly" }, () => {
    assert.equal(resolvePolarProductId("unknown", "weekly"), "member-monthly");
  });
});

test("resolvePolarProductTier recognizes configured and Checkout Link products", () => {
  withEnv(
    {
      NEXT_PUBLIC_POLAR_MEMBER_MONTHLY_PRODUCT_ID: "configured-member",
      NEXT_PUBLIC_POLAR_COMPANY_ANNUAL_PRODUCT_ID: "configured-company",
    },
    () => {
      assert.equal(resolvePolarProductTier("configured-member"), "member");
      assert.equal(resolvePolarProductTier("configured-company"), "company");
      assert.equal(
        resolvePolarProductTier("126bbba8-f3c7-4fcd-b2a1-0b3ab86032f6"),
        "company"
      );
      assert.equal(resolvePolarProductTier("unknown-product"), null);
    }
  );
});

test("resolvePolarProductTier refuses ambiguous product configuration", () => {
  withEnv(
    {
      NEXT_PUBLIC_POLAR_MEMBER_MONTHLY_PRODUCT_ID: "same-product",
      NEXT_PUBLIC_POLAR_COMPANY_MONTHLY_PRODUCT_ID: "same-product",
    },
    () => {
      assert.equal(resolvePolarProductTier("same-product"), null);
    }
  );
});

test("getPolarPortalBase requires an organization slug and uses the active server", () => {
  withEnv({}, () => {
    assert.throws(() => getPolarPortalBase(), /POLAR_ORGANIZATION_SLUG is required/);
  });

  withEnv({ POLAR_ORGANIZATION_SLUG: "go-sandbox" }, () => {
    assert.equal(
      getPolarPortalBase(),
      "https://sandbox.polar.sh/go-sandbox/portal/overview"
    );
  });

  withEnv({ POLAR_SERVER: "production", POLAR_ORGANIZATION_SLUG: "go" }, () => {
    assert.equal(getPolarPortalBase(), "https://polar.sh/go/portal/overview");
  });
});

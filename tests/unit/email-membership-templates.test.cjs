const assert = require("node:assert/strict");
const test = require("node:test");
const { loadSourceModule } = require("../helpers/load-source-module.cjs");

const membership = loadSourceModule("src/constants/membership.js", [
  "MEMBERSHIP_PLANS",
]);
const emailEvents = loadSourceModule("src/lib/email/events.js", [
  "EMAIL_CATEGORIES",
  "EMAIL_EVENTS",
  "getEmailEventDefinition",
]);
const utils = loadSourceModule("src/lib/email/utils.js", [
  "absoluteSiteUrl",
  "escapeHtml",
  "firestoreDateToDate",
]);
const base = loadSourceModule(
  "src/lib/email/templates/base.js",
  ["renderEmailLayout"],
  {
    stripImports: true,
    sandbox: {
      absoluteSiteUrl: utils.absoluteSiteUrl,
      escapeHtml: utils.escapeHtml,
    },
  }
);
const templates = loadSourceModule(
  "src/lib/email/templates/events.js",
  ["renderEmailEventTemplate"],
  {
    stripImports: true,
    sandbox: {
      EMAIL_CATEGORIES: emailEvents.EMAIL_CATEGORIES,
      MEMBERSHIP_PLANS: membership.MEMBERSHIP_PLANS,
      absoluteSiteUrl: utils.absoluteSiteUrl,
      escapeHtml: utils.escapeHtml,
      firestoreDateToDate: utils.firestoreDateToDate,
      getEmailEventDefinition: emailEvents.getEmailEventDefinition,
      renderEmailLayout: base.renderEmailLayout,
    },
  }
);

const tierCases = [
  { tier: "member", name: "GO Community" },
  { tier: "company", name: "GO Business" },
];
const intervalCases = [
  { value: "month", label: "Monthly" },
  { value: "year", label: "Annual" },
];

for (const tierCase of tierCases) {
  for (const intervalCase of intervalCases) {
    test(`membership activation renders ${tierCase.name} ${intervalCase.label}`, () => {
      const rendered = templates.renderEmailEventTemplate(
        "billing.membership_activated",
        {
          activationDate: new Date("2026-07-28T12:00:00.000Z"),
          amount: 4900,
          amountLabel: "Amount paid",
          currency: "eur",
          firstName: "Ada",
          interval: intervalCase.value,
          nextRenewalDate: new Date("2026-08-28T12:00:00.000Z"),
          tier: tierCase.tier,
          willRenew: true,
        }
      );

      assert.equal(
        rendered.subject,
        `Your ${tierCase.name} membership is active`
      );
      assert.match(rendered.html, new RegExp(tierCase.name));
      assert.match(rendered.html, new RegExp(`>${intervalCase.label}<`));
      assert.match(rendered.html, /€49\.00/);
      assert.match(rendered.text, /Go to your dashboard: https:\/\/www\.galacticomnivore\.com\/dashboard/);
      assert.match(rendered.text, /Manage billing: https:\/\/www\.galacticomnivore\.com\/billing/);
      assert.match(rendered.text, /Contact Galactic Omnivore: https:\/\/www\.galacticomnivore\.com\/contact/);
    });
  }
}

for (const tierCase of tierCases) {
  test(`welcome and reminder copy adapt to ${tierCase.name}`, () => {
    const welcome = templates.renderEmailEventTemplate("account.welcome", {
      firstName: "Ada",
      tier: tierCase.tier,
    });
    const reminder = templates.renderEmailEventTemplate(
      "onboarding.incomplete_reminder",
      {
        firstName: "Ada",
        onboardingStarted: true,
        tier: tierCase.tier,
      }
    );

    assert.match(welcome.html, new RegExp(tierCase.name.replace("GO ", "")));
    assert.match(welcome.text, /Finish onboarding:/);
    assert.match(welcome.text, /Build or update your GO CV:/);
    assert.match(welcome.text, /Explore projects:/);
    assert.match(welcome.text, /Browse member resources:/);
    assert.match(reminder.html, new RegExp(tierCase.name));
    assert.match(reminder.text, /Continue where you left off/);
  });
}

test("membership templates omit unavailable optional billing values", () => {
  const rendered = templates.renderEmailEventTemplate(
    "billing.membership_activated",
    { tier: "member" }
  );

  assert.doesNotMatch(rendered.html, /Amount paid/);
  assert.doesNotMatch(rendered.html, /Next renewal/);
  assert.doesNotMatch(rendered.html, />Activated</);
  assert.doesNotMatch(rendered.html, /undefined|null/);
  assert.doesNotMatch(rendered.text, /undefined|null/);
});

test("membership templates escape user-controlled names", () => {
  const malicious = `<img src=x onerror="alert(1)">`;
  const rendered = templates.renderEmailEventTemplate(
    "billing.membership_activated",
    {
      activationDate: new Date("2026-07-28T12:00:00.000Z"),
      firstName: malicious,
      tier: "member",
    }
  );

  assert.doesNotMatch(rendered.html, /<img src=x/);
  assert.match(
    rendered.html,
    /&lt;img src=x onerror=&quot;alert\(1\)&quot;&gt;/
  );
});

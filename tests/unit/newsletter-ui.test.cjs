const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const { loadSourceModule } = require("../helpers/load-source-module.cjs");

const root = path.resolve(__dirname, "../..");
const componentSource = fs.readFileSync(
  path.join(root, "src/components/newsletter/NewsletterSignup.jsx"),
  "utf8"
);
const landingSource = fs.readFileSync(
  path.join(root, "src/app/(main)/page.js"),
  "utf8"
);
const footerSource = fs.readFileSync(
  path.join(root, "src/components/Footer.jsx"),
  "utf8"
);
const newsletterSource = fs.readFileSync(
  path.join(root, "src/lib/email/newsletter.js"),
  "utf8"
);
const ctaSource = fs.readFileSync(
  path.join(root, "src/components/landing/FullCTA.js"),
  "utf8"
);
const dividerSource = fs.readFileSync(
  path.join(root, "src/components/landing/PixelSectionDivider.js"),
  "utf8"
);

const newsletterClient = loadSourceModule(
  "src/lib/newsletter-client.js",
  ["NEWSLETTER_FORM_MESSAGES", "validateNewsletterSubmission"]
);

test("newsletter validation rejects invalid email and missing consent", () => {
  let result = newsletterClient.validateNewsletterSubmission({
    email: "not-an-email",
    consent: false,
  });
  assert.equal(result.emailError, "Enter a valid email address.");
  assert.equal(
    result.consentError,
    "Please confirm that you agree to receive email updates."
  );

  result = newsletterClient.validateNewsletterSubmission({
    email: "  Member+GO@example.com  ",
    consent: true,
  });
  assert.equal(result.email, "Member+GO@example.com");
  assert.equal(result.emailError, "");
  assert.equal(result.consentError, "");
});

test("one shared newsletter component serves landing and footer variants", () => {
  assert.match(componentSource, /section:[\s\S]*Join the GO mailing list/);
  assert.match(componentSource, /footer:[\s\S]*heading: "Newsletter"/);
  assert.match(
    componentSource,
    /Join the Galactic Omnivore mailing list\./
  );
  assert.match(
    componentSource,
    /I agree to receive email updates from Galactic Omnivore/
  );
  assert.match(componentSource, /href="\/privacy"/);
  assert.match(componentSource, />\s*Privacy Policy\s*<\/Link>/);
  assert.doesNotMatch(
    componentSource,
    /Community news and opportunities, sent thoughtfully/
  );
  assert.doesNotMatch(componentSource, /Exclusive updates/i);
});

test("newsletter component uses the real backend with shared safe states", () => {
  assert.match(componentSource, /fetch\("\/api\/newsletter\/subscribe"/);
  assert.match(componentSource, /credentials: "same-origin"/);
  assert.match(componentSource, /if \(inFlight\.current\) return/);
  assert.match(componentSource, /disabled=\{state === "loading"\}/);
  assert.match(componentSource, /aria-live="polite"/);
  assert.match(componentSource, /role="alert"/);
  assert.match(componentSource, /autoComplete="email"/);
  assert.match(componentSource, /name="company"/);
  assert.equal(
    newsletterClient.NEWSLETTER_FORM_MESSAGES.genericError,
    "We could not complete the subscription. Please try again."
  );
});

test("landing and footer restore their distinct audited sources", () => {
  assert.match(landingSource, /id="newsletter"/);
  assert.match(landingSource, /source="landing-page"/);
  assert.match(landingSource, /variant="section"/);
  assert.match(footerSource, /source="footer"/);
  assert.match(footerSource, /variant="footer"/);
  assert.doesNotMatch(landingSource, /NEXT_PUBLIC_NEWSLETTER_ENABLED/);
  assert.doesNotMatch(footerSource, /NEXT_PUBLIC_NEWSLETTER_ENABLED/);
  assert.match(newsletterSource, /"landing-page"/);
  assert.match(newsletterSource, /"footer"/);
});

test("landing close uses the approved CTA copy and verified destinations", () => {
  assert.match(ctaSource, /Find your place in Galactic Omnivore/);
  assert.match(ctaSource, /Whether you want to learn, contribute to a project/);
  assert.match(ctaSource, /Join Our Discord/);
  assert.match(ctaSource, /https:\/\/discord\.gg\/ZbSShxu6K4/);
  assert.match(ctaSource, /href="\/membership"/);
  assert.match(ctaSource, /Review Membership/);
  assert.match(ctaSource, /href="\/projects"/);
  assert.match(ctaSource, /Explore Projects/);
  assert.doesNotMatch(ctaSource, /Level up your game development journey/i);
  assert.doesNotMatch(ctaSource, /ENGAGE/);
});

test("signal transition is short, deterministic, and decorative", () => {
  assert.match(dividerSource, /h-\[88px\]/);
  assert.match(dividerSource, /sm:h-\[120px\]/);
  assert.match(dividerSource, /lg:h-\[160px\]/);
  assert.match(dividerSource, /aria-hidden="true"/);
  assert.match(dividerSource, /SIGNAL_FRAGMENTS\.map/);
  assert.doesNotMatch(dividerSource, /Math\.random/);
  assert.doesNotMatch(dividerSource, /pixeldown|pixelup|next\/image/i);
  assert.match(landingSource, /className="bg-\[#0a090a\]/);
  assert.match(landingSource, /border-primary\/30 bg-\[#151015\]/);
});

test("newsletter remains enabled by default with a server-only emergency opt-out", () => {
  const feature = loadSourceModule(
    "src/lib/newsletter-feature.js",
    ["isNewsletterEnabled"],
    {
      sandbox: { process: { env: {} } },
    }
  );
  assert.equal(feature.isNewsletterEnabled(), true);

  const disabled = loadSourceModule(
    "src/lib/newsletter-feature.js",
    ["isNewsletterEnabled"],
    {
      sandbox: { process: { env: { NEWSLETTER_ENABLED: "false" } } },
    }
  );
  assert.equal(disabled.isNewsletterEnabled(), false);
});

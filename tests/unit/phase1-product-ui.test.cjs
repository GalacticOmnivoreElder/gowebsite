const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");

const header = fs.readFileSync("src/components/Header.jsx", "utf8");
const navigation = fs.readFileSync("src/lib/navigation.js", "utf8");
const membership = fs.readFileSync("src/app/membership/page.js", "utf8");
const pricing = fs.readFileSync("src/components/pricing/PricingDisplay.js", "utf8");
const mentorApplicationButton = fs.readFileSync("src/components/pricing/MentorApplicationButton.jsx", "utf8");

test("global navigation groups every learning destination under Learn", () => {
  for (const label of ["Courses", "Workshops", "Video Bundles", "Resources"]) {
    assert.match(navigation, new RegExp(`label: "${label}"`));
  }
  const primaryBlock = navigation.split("primaryNavigation")[1];
  assert.doesNotMatch(primaryBlock, /label: "Video Bundles"|label: "Resources"/);
  assert.match(header, /NavigationMenuTrigger[\s\S]*Learn/);
  assert.match(header, /AccordionTrigger[\s\S]*Learn/);
  assert.match(header, /isLearningActive/);
  assert.ok(header.indexOf("primaryNavigation.slice(0, 2)") < header.indexOf("<NavigationMenu"));
  assert.ok(header.indexOf("<NavigationMenu") < header.indexOf("primaryNavigation.slice(2)"));
});

test("membership presents separate Mentor applications and the visible Mentor tier", () => {
  for (const title of ["Public / Free", "GO Community", "GO Mentor programme", "GO Business"]) assert.match(membership, new RegExp(`title: "${title}"`));
  assert.match(membership, /Membership plans and pricing/);
  assert.match(membership, /PricingDisplay checkoutEnabled/);
  assert.match(pricing, /const displayedPlans = MEMBERSHIP_PLANS/);
  assert.match(pricing, />\s*Coming soon\s*</);
  const mentorBlock = membership.split('id: "mentor-programme"')[1].split('id: "business"')[0];
  assert.match(mentorBlock, /MentorApplicationButton/);
  assert.match(mentorBlock, /not a paid subscription/);
  assert.match(mentorApplicationButton, /if \(!applicationsOpen\) return null/);
  assert.doesNotMatch(mentorApplicationButton, /Applications closed/);
});

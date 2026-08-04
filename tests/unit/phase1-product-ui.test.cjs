const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");

const header = fs.readFileSync("src/components/Header.jsx", "utf8");
const navigation = fs.readFileSync("src/lib/navigation.js", "utf8");
const membership = fs.readFileSync("src/app/membership/page.js", "utf8");

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

test("membership presents four categories while mentor stays unpriced and closed", () => {
  for (const title of ["Public / Free", "GO Community", "Mentor Programme", "GO Business"]) assert.match(membership, new RegExp(`title: "${title}"`));
  assert.match(membership, /title: "Mentor Programme"[\s\S]*badge: "Coming Soon"/);
  const mentorBlock = membership.split('id: "mentor-programme"')[1].split('id: "business"')[0];
  assert.doesNotMatch(mentorBlock, /pricing|checkoutUrl|MKD/);
  assert.match(mentorBlock, /Direct reviews shared only with author consent and mentor selection/);
});

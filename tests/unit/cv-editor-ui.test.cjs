const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");

test("CV list fields preserve spaces and commas while the member is typing", () => {
  const source = fs.readFileSync(
    "src/components/profile/CvWorkspace.jsx",
    "utf8"
  );

  assert.match(source, /const \[draftText, setDraftText\] = useState/);
  assert.match(source, /setDraftText\(text\);\s*onChange\(textToList\(text\)\);/);
  assert.match(source, /value=\{draftText\}/);
  assert.match(source, /onBlur=\{finishEditing\}/);
  assert.doesNotMatch(
    source,
    /value=\{listToText\(value\)\}\s*onChange=\{\(text\) => onChange\(textToList\(text\)\)\}/
  );
});

const assert = require("node:assert/strict");
const test = require("node:test");
const { loadSourceModule } = require("../helpers/load-source-module.cjs");

const { cn } = loadSourceModule("src/lib/utils.js", ["cn"], {
  stripImports: true,
  sandbox: {
    clsx(...inputs) {
      return inputs
        .flat(Infinity)
        .filter(Boolean)
        .map((input) => {
          if (typeof input === "string") return input;
          if (typeof input === "object") {
            return Object.entries(input)
              .filter(([, enabled]) => enabled)
              .map(([key]) => key)
              .join(" ");
          }
          return "";
        })
        .filter(Boolean)
        .join(" ");
    },
    twMerge(value) {
      const tokens = value.split(/\s+/).filter(Boolean);
      const byGroup = new Map();
      for (const token of tokens) {
        const group = token.startsWith("p-")
          ? "p"
          : token.startsWith("px-")
            ? "px"
            : token;
        byGroup.set(group, token);
      }
      return Array.from(byGroup.values()).join(" ");
    },
  },
});

test("cn combines conditional classes and applies tailwind-style merging", () => {
  assert.equal(cn("text-sm", ["font-bold"], { hidden: false, block: true }), "text-sm font-bold block");
  assert.equal(cn("p-2", "p-4"), "p-4");
});

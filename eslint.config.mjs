import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

export default defineConfig([
  ...nextVitals,
  {
    // Keep the repository's previous Next 15 lint policy while using the
    // Next 16 flat-config entry point. These React 19 compiler rules are a
    // separate refactor and are not correctness errors on React 18.
    rules: {
      "react-hooks/immutability": "off",
      "react-hooks/set-state-in-effect": "off",
    },
  },
  {
    files: ["tests/**/*.{cjs,mjs,js}"],
    rules: {
      "@next/next/no-assign-module-variable": "off",
    },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    ".tmp-npm-cli/**",
  ]),
]);

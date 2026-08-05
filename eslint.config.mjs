import next from "eslint-config-next/core-web-vitals"

/**
 * `npm run lint` was declared as `eslint .` long before ESLint was installed, so the script
 * always failed and nothing in this repository had ever been linted (T07-D4). The demo removal
 * in Track 07 is what made that expensive: a deletion of that size leaves dead references
 * behind, and only a linter finds them.
 *
 * `eslint-config-next/core-web-vitals` supplies the Next, React, hooks, a11y and import plugins
 * plus the TypeScript parser, but it enables no `@typescript-eslint` rules of its own. The
 * choices below are therefore deliberate, and the two downgrades are documented debt rather
 * than silence:
 *
 * - `no-unused-vars` is an error. This is the rule that pays for the whole setup.
 * - `no-explicit-any` is a warning. 70 source occurrences predate this config, most of them
 *   at the Supabase row boundary; typing them is its own change (see docs/deferred-work.md).
 * - `react-hooks/set-state-in-effect` is a warning. All 25 occurrences are the same
 *   load-on-mount pattern (`useEffect(() => { void reload() }, [reload])`) used by every
 *   screen in the app; changing it is a data-loading refactor that needs browser verification.
 */
export default [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      // Written by `supabase start`; a bundled Deno runtime, not this project's source.
      "supabase/.temp/**",
      // Playwright MCP writes acceptance-run screenshots and traces here.
      ".playwright-mcp/**",
      "public/**",
      "__pycache__/**",
      ".venv-marker/**",
    ],
  },
  ...next,
  {
    // The glob must match `next/typescript` exactly: flat config resolves a rule's plugin
    // namespace only from config objects that apply to the same file, so widening this to
    // `.mjs` would ask for `@typescript-eslint` where that config never registered it.
    name: "pipeqc",
    files: ["**/*.ts", "**/*.tsx"],
    rules: {
      // The leading-underscore escape hatch is already the convention here (`_wpsId` in the
      // fixture bootstraps) for an argument kept only for its position.
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          args: "after-used",
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
          ignoreRestSiblings: true,
        },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
      "react-hooks/set-state-in-effect": "warn",
      "no-console": ["error", { allow: ["warn", "error"] }],
    },
  },
  {
    // Unit tests hand-roll Supabase client mocks, where `any` is the honest type, and print
    // their own progress. Operator scripts print by design: stdout is their interface.
    name: "pipeqc/tests-and-scripts",
    files: ["**/*.test.ts", "**/*.test.tsx", "scripts/**/*.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "no-console": "off",
    },
  },
]

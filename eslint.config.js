import js from "@eslint/js";
import { readGitignoreFiles } from "eslint-gitignore";
import { defineConfig } from "eslint/config";
import globals from "globals";
import tseslint from "typescript-eslint";

export default defineConfig([
  { ignores: [...readGitignoreFiles({ cwd: __dirname }), "**/*.lock"] },
  {
    files: ["**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
    plugins: { js },
    extends: ["js/recommended"],
    languageOptions: { globals: { ...globals.browser, Bun: "readonly" } },
  },
  tseslint.configs.recommended,
  // App/client code: browser globals
  {
    files: ["**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
    ignores: ["scripts/**"], // we’ll handle scripts in the next block
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.browser,
      },
    },
    rules: {
      "react/react-in-jsx-scope": "off",
      "react/no-unescaped-entities": "off",
      "react/display-name": "off",
    },
  },

  // Scripts & config files: Node + Bun globals
  {
    files: [
      "scripts/**/*.{js,mjs,cjs,ts,mts,cts}",
      "**/*.{config,conf}.{js,mjs,cjs,ts}", // e.g. vite.config.ts, etc.
    ],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.node, // gives you `process`, etc.
        Bun: "readonly", // fix `Bun` is not defined
      },
    },
    rules: {},
  },
  {
    rules: {
      "no-case-declarations": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          varsIgnorePattern: "^_",
          argsIgnorePattern: "^_",
          caughtErrors: "all", // make catch params subject to the rule
          caughtErrorsIgnorePattern: "^_", // …but ignore ones starting with "_"
          ignoreRestSiblings: true, // optional: common ergonomic tweak
        },
      ],
    },
  },
]);

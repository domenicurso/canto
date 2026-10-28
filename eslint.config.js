import tseslint from "typescript-eslint";

// Oxlint owns code linting; ESLint retains the structural limits it does not implement.
export default tseslint.config({
  ignores: ["node_modules/**"],
  files: ["**/*.ts"],
  languageOptions: { parser: tseslint.parser },
  rules: {
    "max-lines": ["error", { max: 200 }],
    "max-lines-per-function": [
      "error",
      { max: 50, skipBlankLines: false, skipComments: false },
    ],
    "max-depth": ["error", 3],
    "max-params": ["error", 4],
  },
});

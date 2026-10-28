import tseslint from "typescript-eslint";

export default tseslint.config({ ignores: ["node_modules/**"] }, ...tseslint.configs.recommended, {
  files: ["**/*.ts"],
  rules: {
    "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    "@typescript-eslint/no-this-alias": "off",
    "max-lines": ["error", { max: 200 }],
    "max-lines-per-function": ["error", { max: 50, skipBlankLines: false, skipComments: false }],
    "max-depth": ["error", 3],
    "max-params": ["error", 4],
  },
});

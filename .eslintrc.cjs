/** @type {import("eslint").Linter.Config} */
module.exports = {
  root: true,
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:@typescript-eslint/recommended-requiring-type-checking",
    "prettier",
  ],
  globals: {
    svelte: "readonly",
    $$Generic: "readonly",
  },
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint"],
  parserOptions: {
    extraFileExtensions: [".svelte"],
    project: "./tsconfig.json",
    tsconfigRootDir: __dirname,
  },
  ignorePatterns: ["*.cjs", "svelte.config.js"],
  env: {
    browser: true,
    es2017: true,
    node: true,
  },

  overrides: [
    {
      files: ["*.svelte"],
      extends: ["plugin:svelte/recommended"],
      parser: "svelte-eslint-parser",
      parserOptions: {
        parser: "@typescript-eslint/parser",
      },
      /**
       * There are quite a few @typescript-eslint rules that don't work
       * well in Svelte <script> blocks and introduce false positives.
       * @see https://github.com/CaptainCodeman/svelte-headlessui/blob/master/packages/lib/.eslintrc.cjs
       */
      rules: {
        "@typescript-eslint/no-unnecessary-condition": "off",
        "@typescript-eslint/no-unsafe-argument": "off",
        "@typescript-eslint/no-unsafe-assignment": "off",
        "@typescript-eslint/no-unsafe-call": "off",
        "@typescript-eslint/no-unsafe-member-access": "off",
        "@typescript-eslint/restrict-template-expressions": "off",
      },
    },
  ],
};

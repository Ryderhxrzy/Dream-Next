// Shared Prettier configuration for the whole monorepo (every package under apps/*).
// This is the SINGLE source of truth: each app resolves up the directory tree to
// this file, so formatting is identical across all frontend and backend packages.
// Mirrors the original apsara-home-frontend options, with the plugins correctly
// declared so import-sorting and Tailwind class-sorting actually run.

/** @type {import("prettier").Config} */
const config = {
  endOfLine: "lf",
  semi: false,
  singleQuote: false,
  tabWidth: 2,
  trailingComma: "es5",

  // Prettier 3 only loads plugins listed here.
  // prettier-plugin-tailwindcss MUST stay last so it runs after import sorting.
  plugins: [
    "@ianvs/prettier-plugin-sort-imports",
    "prettier-plugin-tailwindcss",
  ],

  importOrder: [
    "^(react/(.*)$)|^(react$)",
    "<THIRD_PARTY_MODULES>",
    "",
    "^@workspace/(.*)$",
    "",
    "^types$",
    "^@/types/(.*)$",
    "^@/config/(.*)$",
    "^@/lib/(.*)$",
    "^@/hooks/(.*)$",
    "^@/components/ui/(.*)$",
    "^@/components/(.*)$",
    "^@/registry/(.*)$",
    "^@/styles/(.*)$",
    "^@/app/(.*)$",
    "^@/www/(.*)$",
    "",
    "^[./]",
  ],
}

export default config

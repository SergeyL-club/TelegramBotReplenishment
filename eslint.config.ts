import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import { defineConfig } from "eslint/config";

export default defineConfig([
  tseslint.configs.recommended,
  { ignores: ["node_modules/**", ".husky/**", "./build/**", "eslint.config.ts", "jest.config.js", "init-husky.js", "./tests/**"] },
  {
    files: ["**/*.{js,mjs,cjs,ts,mts,cts}"],
    plugins: { js, "@typescript-eslint": tseslint.plugin },
    extends: [
      "js/recommended",
      tseslint.configs.recommendedTypeChecked,
      {
        languageOptions: {
          parserOptions: {
            projectService: true,
          },
        },
      },
    ],
    languageOptions: { globals: globals.node, parser: tseslint.parser, sourceType: "module" },
    rules: {
      "@typescript-eslint/naming-convention": [
        "error",
        {
          selector: "variable",
          format: ["snake_case"],
        },
        {
          selector: "function",
          format: ["snake_case"],
        },
        {
          selector: "parameter",
          format: ["snake_case"],
        },
        {
          selector: "property",
          modifiers: ["private"],
          format: ["snake_case"],
        },
      ],

      // Всегда ;
      semi: ["error", "always"],

      // Только двойные кавычки
      quotes: ["error", "double", { allowTemplateLiterals: false }],

      // Запрет ``строк`` без ${}
      "no-useless-concat": "error",
      "no-template-curly-in-string": "error",

      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-floating-promises": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/require-await": "off",
    },
  },
]);

import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import { defineConfig } from "eslint/config";

export default defineConfig([
  { ignores: ["node_modules/**", ".husky/**", "./build/**", "eslint.config.ts", "jest.config.js"] },
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
      // Стрелочные функции только как const fn = () => {}
      "prefer-const": "error",
      "func-style": ["error", "declaration"],
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
          leadingUnderscore: "forbid",
          trailingUnderscore: "forbid",
        },
      ],

      // Всегда ;
      semi: ["error", "always"],

      // Только двойные кавычки
      quotes: ["error", "double", { allowTemplateLiterals: false }],

      // Запрет ``строк`` без ${}
      "no-useless-concat": "error",
      "no-template-curly-in-string": "error",

      // Разрешаем нормальный TS-стиль
      "@typescript-eslint/no-explicit-any": "off",
       "@typescript-eslint/no-redundant-type-constituents": "off",

      // functions
      "@typescript-eslint/explicit-member-accessibility": ["error", { accessibility: "explicit" }],
      "@typescript-eslint/explicit-function-return-type": ["error", { allowExpressions: false }],
      "require-await": "off",
      "@typescript-eslint/require-await": "error",
    },
  },
  tseslint.configs.recommended,
]);

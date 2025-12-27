import tseslint from "typescript-eslint";
import { defineConfig } from "eslint/config";

export default defineConfig([
  { ignores: ["node_modules/**", ".husky/**", "./build/**", "eslint.config.ts", "jest.config.js", "init-husky.js"] },
  tseslint.configs.recommended,
]);

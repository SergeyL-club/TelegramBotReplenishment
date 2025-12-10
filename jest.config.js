import { createDefaultEsmPreset } from "ts-jest";

const ts_jest_transform_cfg = createDefaultEsmPreset().transform;

/** @type {import("jest").Config} **/
export default {
  testEnvironment: "node",
  transform: {
    ...ts_jest_transform_cfg,
  },
  testPathIgnorePatterns: ["/node_modules/", "/.husky/"],
};

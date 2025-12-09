import { execSync } from "child_process";
import { existsSync } from "fs";

if (!existsSync(".husky/_")) {
  console.log("Initializing Husky...");
  execSync("npx husky init", { stdio: "inherit" });
} else console.log("Husky is already initialized.");

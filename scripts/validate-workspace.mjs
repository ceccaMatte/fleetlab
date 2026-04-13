import { existsSync } from "node:fs";

const requiredPaths = [
  "apps/api/package.json",
  "apps/device-simulator/package.json",
  "apps/web-dashboard/package.json",
  "packages/shared/package.json",
  "packages/config/package.json",
  "prisma/README.md",
  "docs/README.md"
];

const missingPaths = requiredPaths.filter((path) => !existsSync(path));

if (missingPaths.length > 0) {
  console.error("Workspace validation failed. Missing paths:");

  for (const path of missingPaths) {
    console.error(`- ${path}`);
  }

  process.exit(1);
}

console.log("Workspace validation passed.");

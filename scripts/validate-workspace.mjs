import { existsSync } from "node:fs";

const requiredPaths = [
  "apps/api/package.json",
  "apps/api/tsconfig.json",
  "apps/api/src/app.ts",
  "apps/api/src/server.ts",
  "apps/api/src/config/env.ts",
  "apps/api/src/contracts/device-topics.ts",
  "apps/api/src/contracts/device-messages.ts",
  "apps/api/src/contracts/device-message-codec.ts",
  "apps/api/src/modules/health/health-routes.ts",
  "apps/api/src/modules/devices/device-state-projection.ts",
  "apps/api/src/modules/devices/device-state-store.ts",
  "apps/api/src/modules/devices/device-routes.ts",
  "apps/api/src/modules/mqtt/mqtt-broker.ts",
  "apps/api/test/app.test.ts",
  "apps/api/test/device-message-codec.test.ts",
  "apps/api/test/device-topics.test.ts",
  "apps/api/test/device-messages.test.ts",
  "apps/api/test/device-state-projection.test.ts",
  "apps/api/test/device-state-store.test.ts",
  "apps/api/test/device-routes.test.ts",
  "apps/api/test/mqtt-broker.test.ts",
  "apps/api/test/env.test.ts",
  "apps/device-simulator/package.json",
  "apps/web-dashboard/package.json",
  "packages/shared/package.json",
  "packages/config/package.json",
  "prisma/README.md",
  "prisma/schema.prisma",
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

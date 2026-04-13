import { spawnSync } from "node:child_process";

const result = spawnSync(process.execPath, ["scripts/validate-workspace.mjs"], {
  stdio: "inherit"
});

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

console.log("Workspace scaffold is in place. No additional setup steps are required yet.");

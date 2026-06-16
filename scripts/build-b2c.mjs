import { spawnSync } from "node:child_process";

process.env.B2C_STATIC_EXPORT = "true";

const command = process.platform === "win32" ? "next.cmd" : "next";
const result = spawnSync(command, ["build"], { stdio: "inherit" });

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 1);
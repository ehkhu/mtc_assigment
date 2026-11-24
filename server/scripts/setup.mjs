import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const serverRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(path.join(serverRoot, "package.json"));

const envFile = path.join(serverRoot, ".env");
const envExample = path.join(serverRoot, ".env.example");

if (!existsSync(envFile)) {
  if (!existsSync(envExample)) {
    console.error("server/.env is missing, and server/.env.example was not found.");
    process.exit(1);
  }
  copyFileSync(envExample, envFile);
  console.log("Created server/.env from .env.example");
}

function run(args) {
  const result = spawnSync(process.execPath, args, {
    cwd: serverRoot,
    stdio: "inherit",
    env: process.env,
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

const seedOnly = process.argv.includes("--seed-only");

if (!seedOnly) {
  const prismaCli = require.resolve("prisma/build/index.js");
  run([prismaCli, "db", "push"]);
}

// Bun rewrites a script that calls the tsx binary and looks for a preload
// that is not laid out the way it expects. Import tsx from Node instead,
// and let Bun run the seed file directly when Bun itself is the runtime.
if (process.versions.bun) run(["prisma/seed.ts"]);
else run(["--import", "tsx", "prisma/seed.ts"]);

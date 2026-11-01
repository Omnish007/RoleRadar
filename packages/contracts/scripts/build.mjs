import { mkdirSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const packageRoot = fileURLToPath(new URL("../", import.meta.url));
const tsc = join(packageRoot, "node_modules", "typescript", "bin", "tsc");

function compile(config) {
  const result = spawnSync(process.execPath, [tsc, "-p", join(packageRoot, config)], {
    cwd: packageRoot,
    stdio: "inherit"
  });

  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

compile("tsconfig.esm.json");
compile("tsconfig.cjs.json");

const cjsDirectory = join(packageRoot, "dist", "cjs");
mkdirSync(cjsDirectory, { recursive: true });
rmSync(join(cjsDirectory, "index.d.cts"), { force: true });
renameSync(join(cjsDirectory, "index.d.ts"), join(cjsDirectory, "index.d.cts"));
writeFileSync(join(cjsDirectory, "package.json"), '{"type":"commonjs"}\n');

console.log("Contracts built for ESM (renderer) and CommonJS (API).");

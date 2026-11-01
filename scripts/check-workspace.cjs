const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const rootPackage = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const required = [
  "apps/desktop/package.json", "apps/api/package.json", "apps/ai-service/package.json",
  "packages/contracts/package.json", "docker-compose.yml", ".env.example"
];
const errors = [];
for (const relative of required) {
  if (!fs.existsSync(path.join(root, relative))) errors.push(`Missing required workspace file: ${relative}`);
}
if (!rootPackage.packageManager?.startsWith("pnpm@")) errors.push("Root package.json must pin pnpm via packageManager.");
for (const relative of required.filter((item) => item.endsWith("package.json"))) {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, relative), "utf8"));
  if (!manifest.name) errors.push(`${relative} must declare a package name.`);
}
if (!fs.existsSync(path.join(root, "apps/desktop/src/main/index.ts"))) errors.push("Electron main process entry is missing.");
if (!fs.existsSync(path.join(root, "apps/api/src/main.ts"))) errors.push("NestJS API entry is missing.");
if (!fs.existsSync(path.join(root, "apps/ai-service/app/main.py"))) errors.push("Python AI service entry is missing.");
if (errors.length) {
  errors.forEach((message) => console.error(`- ${message}`));
  process.exitCode = 1;
} else {
  console.log("Workspace structure checks passed.");
}

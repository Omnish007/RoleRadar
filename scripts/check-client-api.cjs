const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const rendererRoot = path.join(root, "apps/desktop/src/renderer/src");
const apiFile = path.join(rendererRoot, "lib/api.ts");
const preloadFile = path.join(root, "apps/desktop/src/preload/index.ts");
const apiSource = fs.readFileSync(apiFile, "utf8");
const apiObject = apiSource.match(/export const api = \{([\s\S]*?)\n\};/);
const preloadSource = fs.readFileSync(preloadFile, "utf8");
const errors = [];

if (!apiObject) errors.push("Could not find the renderer API client object.");
const declared = new Set([...(apiObject?.[1] || "").matchAll(/^\s*([A-Za-z_$][\w$]*):/gm)].map((match) => match[1]));
const ignored = new Set(["lib", "types", "components"]);
function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === "dist") continue;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) { walk(absolute); continue; }
    if (!/\.(tsx?|jsx?)$/.test(entry.name) || absolute === apiFile) continue;
    const source = fs.readFileSync(absolute, "utf8");
    for (const match of source.matchAll(/\bapi\.([A-Za-z_$][\w$]*)/g)) {
      if (!declared.has(match[1]) && !ignored.has(match[1])) errors.push(`${path.relative(root, absolute)} calls missing api.${match[1]}()`);
    }
  }
}
walk(rendererRoot);
if (!/apiBase:\s*["']http:\/\/127\.0\.0\.1:4310\/api["']/.test(preloadSource)) errors.push("The Electron preload bridge does not expose the local API base URL.");
if (errors.length) { errors.forEach((item) => console.error(`- ${item}`)); process.exitCode = 1; }
else console.log(`Renderer API surface check passed (${declared.size} API methods).`);

const fs = require("node:fs");
const path = require("node:path");

const target = path.resolve(__dirname, "../apps/desktop/sidecar/api");
fs.rmSync(target, { recursive: true, force: true });
fs.mkdirSync(path.dirname(target), { recursive: true });
console.log(`Prepared clean API sidecar destination: ${target}`);

const fs = require("node:fs");
const path = require("node:path");

const desktopRoot = path.resolve(__dirname, "../apps/desktop");
const outputRoot = path.join(desktopRoot, "out");
const requiredFiles = [
  "main/index.js",
  "preload/index.js",
  "renderer/index.html"
];

const missing = requiredFiles.filter((relativePath) =>
  !fs.existsSync(path.join(outputRoot, relativePath))
);

if (missing.length > 0) {
  console.error("\n[packaging guard] Electron build output is incomplete.");
  for (const relativePath of missing) {
    console.error(`  Missing: apps/desktop/out/${relativePath}`);
  }
  console.error("\nRenderer output must be under apps/desktop/out/renderer so electron-builder includes it in app.asar.");
  console.error("Inspect apps/desktop/electron.vite.config.ts and keep renderer build.outDir as 'out/renderer'.");
  process.exit(1);
}

const rendererHtml = fs.readFileSync(path.join(outputRoot, "renderer/index.html"), "utf8");
if (!/<script\b[^>]*\bsrc=/.test(rendererHtml)) {
  console.error("[packaging guard] renderer/index.html does not reference a bundled JavaScript entry.");
  process.exit(1);
}

console.log("[packaging guard] Electron output verified:");
for (const relativePath of requiredFiles) {
  console.log(`  ✓ apps/desktop/out/${relativePath}`);
}

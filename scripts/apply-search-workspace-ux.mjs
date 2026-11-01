import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const appPath = resolve("apps/desktop/src/renderer/src/app.tsx");
const importLine = 'import "./sidebar-layout.css";';
let appSource = await readFile(appPath, "utf8");

if (!appSource.includes(importLine)) {
  const brandImport = 'import roleRadarLogo from "./assets/brand/logo-light.svg";';
  if (appSource.includes(brandImport)) {
    appSource = appSource.replace(brandImport, `${brandImport}\n${importLine}`);
  } else {
    const firstImport = appSource.match(/^import .*;$/m)?.[0];
    if (!firstImport) throw new Error("Could not find an import in app.tsx; no changes were made.");
    appSource = appSource.replace(firstImport, `${importLine}\n${firstImport}`);
  }
  await writeFile(appPath, appSource);
  process.stdout.write("Added independent sidebar and page scrolling to the renderer.\n");
} else {
  process.stdout.write("Sidebar layout stylesheet is already connected.\n");
}

const requiredFiles = [
  "apps/desktop/src/renderer/src/sidebar-layout.css",
  "apps/desktop/src/renderer/src/components/search-builder.css",
  "apps/desktop/src/renderer/src/components/search-builder.tsx"
];
for (const file of requiredFiles) await readFile(resolve(file));
process.stdout.write("Search stepper assets and component are present.\n");

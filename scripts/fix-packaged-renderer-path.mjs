import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");

async function replaceOnce(relativePath, oldText, newText, label) {
  const filePath = path.join(projectRoot, relativePath);
  const source = await readFile(filePath, "utf8");

  if (source.includes(newText)) {
    console.log(`[already fixed] ${label}`);
    return;
  }

  if (!source.includes(oldText)) {
    throw new Error(
      `Could not find the expected ${label} in ${relativePath}. No change was made to that file. Review the file before applying a manual edit.`
    );
  }

  await writeFile(filePath, source.replace(oldText, newText));
  console.log(`[fixed] ${label}`);
}

await replaceOnce(
  "apps/desktop/electron.vite.config.ts",
  'build: { outDir: "../../out/renderer", emptyOutDir: true }',
  'build: { outDir: "out/renderer", emptyOutDir: true }',
  "renderer output directory"
);

await replaceOnce(
  "apps/desktop/src/main/index.ts",
  `function rendererEntryUrl(): string {\n  return pathToFileURL(join(__dirname, "../renderer/index.html")).toString();\n}`,
  `function rendererEntryPath(): string {\n  return isDevelopment\n    ? join(__dirname, "../renderer/index.html")\n    : join(app.getAppPath(), "out", "renderer", "index.html");\n}\n\nfunction rendererEntryUrl(): string {\n  return pathToFileURL(rendererEntryPath()).toString();\n}`,
  "explicit packaged renderer path"
);

await replaceOnce(
  "apps/desktop/src/main/index.ts",
  'void window.loadFile(join(__dirname, "../renderer/index.html")).catch(error => console.error("[renderer navigation]", error));',
  'void window.loadFile(rendererEntryPath()).catch(error => console.error("[renderer navigation]", error));',
  "production window load path"
);

const packagePath = path.join(projectRoot, "apps/desktop/package.json");
const packageJson = JSON.parse(await readFile(packagePath, "utf8"));
for (const scriptName of ["build", "build:dir"]) {
  const script = packageJson.scripts?.[scriptName];
  if (typeof script !== "string") {
    throw new Error(`apps/desktop/package.json is missing the ${scriptName} script.`);
  }
  const oldCommand = "electron-vite build && electron-builder";
  const newCommand = "electron-vite build && node ../../scripts/verify-electron-output.cjs && electron-builder";
  if (script.includes(newCommand)) {
    console.log(`[already fixed] ${scriptName} output verification`);
  } else if (script.includes(oldCommand)) {
    packageJson.scripts[scriptName] = script.replace(oldCommand, newCommand);
    console.log(`[fixed] ${scriptName} output verification`);
  } else {
    throw new Error(`Could not safely update the ${scriptName} script; its command has changed.`);
  }
}
await writeFile(packagePath, `${JSON.stringify(packageJson, null, 2)}\n`);

console.log("\nRoleRadar packaged-renderer fix applied. Run the desktop build to verify the actual output.");

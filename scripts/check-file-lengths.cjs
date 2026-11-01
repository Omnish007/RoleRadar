const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const ignored = new Set([".git", "node_modules", "dist", "out", "release", ".venv", "__pycache__", ".pytest_cache", "coverage"]);
const extensions = new Set([".ts", ".tsx", ".js", ".cjs", ".mjs", ".py", ".css", ".json", ".yml", ".yaml", ".md", ".html", ".sh", ".toml", ".ini", ".txt"]);
const violations = [];

function inspect(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (ignored.has(entry.name)) continue;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) { inspect(absolute); continue; }
    if (!entry.isFile() || !extensions.has(path.extname(entry.name)) || entry.name === "pnpm-lock.yaml") continue;
    const lines = fs.readFileSync(absolute, "utf8").split(/\r?\n/).length;
    if (lines > 300) violations.push({ file: path.relative(root, absolute), lines });
  }
}

inspect(root);
if (violations.length) {
  console.error("Files exceed the 300-line project limit:");
  for (const violation of violations) console.error(`- ${violation.file}: ${violation.lines} lines`);
  process.exitCode = 1;
} else {
  console.log("Line-length policy passed: every authored source/config/document file is 300 lines or fewer.");
}

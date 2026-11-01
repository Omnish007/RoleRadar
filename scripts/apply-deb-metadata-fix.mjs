import { readFile, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';

const packagePath = 'apps/desktop/package.json';
const builderPath = 'apps/desktop/electron-builder.yml';
const projectName = 'RoleRadar';
const authorName = 'Omnish Kundariya';
const homepage = 'https://github.com/Omnish007/RoleRadar';
const description = 'A local-first desktop workspace for intelligent job discovery, application tracking, career organization, and AI-assisted search powered by local LLMs.';

let gitEmail = process.env.ROLERADAR_MAINTAINER_EMAIL?.trim();
if (!gitEmail) {
  try {
    gitEmail = execFileSync('git', ['config', '--get', 'user.email'], { encoding: 'utf8' }).trim();
  } catch {
    gitEmail = '';
  }
}

if (!gitEmail || !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(gitEmail)) {
  console.error('A valid maintainer email is required for Debian package metadata.');
  console.error('Set it locally with: git config user.email "you@example.com"');
  console.error('Or rerun with: ROLERADAR_MAINTAINER_EMAIL="you@example.com" node scripts/apply-deb-metadata-fix.mjs');
  process.exit(1);
}

const packageJson = JSON.parse(await readFile(packagePath, 'utf8'));
const previousAuthor = packageJson.author;
const authorFields = previousAuthor && typeof previousAuthor === 'object'
  ? previousAuthor
  : {};

packageJson.description = description;
packageJson.homepage = homepage;
packageJson.repository ??= {
  type: 'git',
  url: 'https://github.com/Omnish007/RoleRadar.git',
};
packageJson.author = {
  ...authorFields,
  name: authorName,
  email: gitEmail,
};
await writeFile(packagePath, `${JSON.stringify(packageJson, null, 2)}\n`);

let builder = await readFile(builderPath, 'utf8');
if (/^  maintainer:/m.test(builder)) {
  builder = builder.replace(/^  maintainer:.*$/m, `  maintainer: "${authorName} <${gitEmail}>"`);
} else {
  const linuxBlock = /^linux:\s*$/m;
  if (!linuxBlock.test(builder)) {
    throw new Error(`Could not find the linux: block in ${builderPath}`);
  }
  builder = builder.replace(linuxBlock, (line) => `${line}\n  maintainer: "${authorName} <${gitEmail}>"`);
}
await writeFile(builderPath, builder);

console.log('Updated RoleRadar Debian/package metadata:');
console.log(`- description: ${packageJson.description}`);
console.log(`- homepage: ${packageJson.homepage}`);
console.log(`- author: ${authorName} (email sourced from local Git configuration)`);
console.log('- linux.maintainer: configured');

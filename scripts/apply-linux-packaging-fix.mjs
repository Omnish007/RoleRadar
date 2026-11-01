import { readFile, writeFile } from 'node:fs/promises';

const packagePath = 'apps/desktop/package.json';
const builderPath = 'apps/desktop/electron-builder.yml';

const packageJson = JSON.parse(await readFile(packagePath, 'utf8'));
packageJson.desktopName = 'com.roleradar.desktop';
await writeFile(packagePath, `${JSON.stringify(packageJson, null, 2)}\n`);

let builder = await readFile(builderPath, 'utf8');

// Keep the workspace package name scoped for pnpm; electron-builder needs a separate safe binary name.
if (/^executableName:/m.test(builder)) {
  builder = builder.replace(/^executableName:.*$/m, 'executableName: roleradar');
} else {
  const productName = /^productName:.*$/m;
  if (!productName.test(builder)) throw new Error(`Could not find productName in ${builderPath}`);
  builder = builder.replace(productName, (line) => `${line}\nexecutableName: roleradar`);
}

// Match Electron's Linux app_id / WM_CLASS with the installed .desktop entry.
if (/^  syncDesktopName:/m.test(builder)) {
  builder = builder.replace(/^  syncDesktopName:.*$/m, '  syncDesktopName: true');
} else {
  const linuxBlock = /^linux:\s*$/m;
  if (!linuxBlock.test(builder)) throw new Error(`Could not find linux config in ${builderPath}`);
  builder = builder.replace(linuxBlock, 'linux:\n  syncDesktopName: true');
}

await writeFile(builderPath, builder);
console.log('RoleRadar Linux packaging configuration updated:');
console.log('- executableName: roleradar');
console.log('- desktopName: com.roleradar.desktop');
console.log('- linux.syncDesktopName: true');

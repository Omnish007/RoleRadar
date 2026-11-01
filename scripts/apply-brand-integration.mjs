import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
if (!existsSync(resolve(root, 'pnpm-workspace.yaml'))) {
  throw new Error('Run this script from the RoleRadar repository root (the folder containing pnpm-workspace.yaml).');
}

async function update(relativePath, transform) {
  const path = resolve(root, relativePath);
  if (!existsSync(path)) throw new Error(`Required project file not found: ${relativePath}`);
  const before = await readFile(path, 'utf8');
  const after = transform(before);
  if (after !== before) {
    await writeFile(path, after, 'utf8');
    console.log(`Updated ${relativePath}`);
  } else {
    console.log(`Already integrated: ${relativePath}`);
  }
}

// Use the horizontal brand lockup in the sidebar without replacing navigation icons.
await update('apps/desktop/src/renderer/src/app.tsx', source => {
  let next = source;
  const rendererImports = [
    'import roleRadarLogo from "./assets/brand/logo-light.svg";',
    'import successStatusIcon from "./assets/icons/status/success.svg";',
    'import errorStatusIcon from "./assets/icons/status/error.svg";'
  ];
  for (const importLine of rendererImports) {
    if (next.includes(importLine)) continue;
    const reactImport = 'import type { ReactNode } from "react";';
    if (!next.includes(reactImport)) throw new Error('Could not locate the renderer import anchor in app.tsx.');
    next = next.replace(reactImport, `${reactImport}\n${importLine}`);
  }

  const oldBrand = '<div className="brand"><div className="brand-mark"><Radar size={21}/></div><div><strong>RoleRadar</strong><small>Job search workspace</small></div></div>';
  const newBrand = '<div className="brand"><img className="brand-logo" src={roleRadarLogo} alt="RoleRadar"/><small>Job search workspace</small></div>';
  if (next.includes(oldBrand)) next = next.replace(oldBrand, newBrand);
  else if (!next.includes('className="brand-logo"')) {
    throw new Error('Could not locate the existing sidebar brand markup. No other app.tsx changes were made.');
  }
  // The old radar glyph was only used in the removed mark container.
  next = next.replace(/,\s*Radar(?=\s*,)/, '');

  const oldNotice = '<div className={`notice ${noticeIsError ? "error" : ""}`} role="status">{notice}<button';
  const newNotice = '<div className={`notice ${noticeIsError ? "error" : ""}`} role="status"><img className="notice-icon" src={noticeIsError ? errorStatusIcon : successStatusIcon} alt="" aria-hidden="true"/>{notice}<button';
  if (next.includes(oldNotice)) next = next.replace(oldNotice, newNotice);
  else if (!next.includes('className="notice-icon"')) {
    throw new Error('Could not locate the global notice markup in app.tsx.');
  }
  return next;
});

// Use the supplied document and JSON file-type marks in the relevant workspaces.
await update('apps/desktop/src/renderer/src/components/resume-workspace.tsx', source => {
  let next = source;
  const importLine = 'import resumeDocumentIcon from "../assets/icons/file-types/doc.svg";';
  if (!next.includes(importLine)) {
    const anchor = 'import { FileText, Plus, Trash2 } from "lucide-react";';
    if (!next.includes(anchor)) throw new Error('Could not locate the resume workspace icon import.');
    next = next.replace(anchor, `${anchor}\n${importLine}`);
  }
  const oldIcon = '<div className="company-avatar"><FileText size={15}/></div>';
  const newIcon = '<div className="company-avatar"><img className="asset-file-icon" src={resumeDocumentIcon} alt="" aria-hidden="true"/></div>';
  if (next.includes(oldIcon)) next = next.replace(oldIcon, newIcon);
  else if (!next.includes('src={resumeDocumentIcon}')) {
    throw new Error('Could not locate the saved resume file icon.');
  }
  return next;
});

await update('apps/desktop/src/renderer/src/components/backup-workspace.tsx', source => {
  let next = source;
  const importLine = 'import backupJsonIcon from "../assets/icons/file-types/json.svg";';
  if (!next.includes(importLine)) {
    const anchor = 'import { Archive, Download, FileUp, ShieldCheck } from "lucide-react";';
    if (!next.includes(anchor)) throw new Error('Could not locate the backup workspace icon import.');
    next = next.replace(anchor, 'import { Download, FileUp, ShieldCheck } from "lucide-react";\n' + importLine);
  }
  const oldIcon = '<span className="backup-icon"><Archive size={19}/></span>';
  const newIcon = '<span className="backup-icon"><img className="asset-file-icon" src={backupJsonIcon} alt="" aria-hidden="true"/></span>';
  if (next.includes(oldIcon)) next = next.replace(oldIcon, newIcon);
  else if (!next.includes('src={backupJsonIcon}')) {
    throw new Error('Could not locate the JSON backup card icon.');
  }
  return next;
});

// Add brand lockup sizing in one isolated block; keep all existing layout rules intact.
await update('apps/desktop/src/renderer/src/styles.css', source => {
  if (source.includes('/* RoleRadar brand lockup */')) return source;
  const brandRules = [
    "/* RoleRadar brand lockup */",
    ".brand { flex-direction: column; align-items: flex-start; gap: 3px; padding: 1px 10px 31px; }",
    ".brand-logo { display: block; width: 178px; max-width: 100%; height: auto; object-fit: contain; object-position: left center; }",
    ".brand > small { display: block; margin: 0 0 0 3px; color: #778397; font-size: 10px; line-height: 1.4; letter-spacing: .12px; }",
    ".notice { display: flex; align-items: center; justify-content: flex-start; gap: 9px; }",
    ".notice button { margin-left: auto; }",
    ".notice-icon { width: 17px; height: 17px; flex: 0 0 17px; object-fit: contain; }",
    ".asset-file-icon { display: block; width: 26px; height: 26px; object-fit: contain; }"
  ].join("\n");
  return `${source.trimEnd()}\n\n${brandRules}\n`;
});

// Tell TypeScript how Vite's SVG asset imports resolve.
await update('apps/desktop/src/renderer/src/types.d.ts', source => {
  if (source.includes('declare module "*.svg"')) return source;
  return `${source.trimEnd()}\n\ndeclare module "*.svg" {\n  const assetUrl: string;\n  export default assetUrl;\n}\n`;
});

// Ensure browser/dev renderer tabs use the RoleRadar favicon set.
await update('apps/desktop/src/renderer/index.html', source => {
  if (source.includes('rel="icon"') && source.includes('favicon.svg')) return source;
  const links = [
    '    <meta name="theme-color" content="#061735" />',
    '    <link rel="icon" href="./favicon.ico" sizes="any" />',
    '    <link rel="icon" type="image/svg+xml" href="./favicon.svg" />',
    '    <link rel="icon" type="image/png" sizes="32x32" href="./favicon-32x32.png" />',
    '    <link rel="icon" type="image/png" sizes="16x16" href="./favicon-16x16.png" />',
    '    <link rel="apple-touch-icon" sizes="180x180" href="./apple-touch-icon.png" />',
    '    <link rel="manifest" href="./site.webmanifest" />'
  ].join('\n');
  if (!source.includes('</head>')) throw new Error('Could not locate </head> in renderer index.html.');
  return source.replace('</head>', `${links}\n  </head>`);
});

// Use the same branded icon for the native Linux application window and packaged notifications.
await update('apps/desktop/src/main/index.ts', source => {
  let next = source;
  if (!next.includes('nativeImage')) {
    const electronImport = next.match(/^import \{([^}]+)\} from "electron";$/m);
    if (!electronImport) throw new Error('Could not locate the Electron import in apps/desktop/src/main/index.ts.');
    const names = electronImport[1].split(',').map(name => name.trim());
    names.push('nativeImage');
    next = next.replace(electronImport[0], `import { ${[...new Set(names)].join(', ')} } from "electron";`);
  }

  if (!next.includes('function resolveRoleRadarIcon()')) {
    const anchor = 'const isDevelopment = !app.isPackaged;';
    if (!next.includes(anchor)) throw new Error('Could not locate the Electron app initialization anchor.');
    const helperLines = [
      anchor,
      "",
      "function resolveRoleRadarIcon() {",
      "  const iconPath = app.isPackaged",
      '    ? join(process.resourcesPath, "app-icon.png")',
      '    : join(app.getAppPath(), "build", "icon.png");',
      "  const icon = nativeImage.createFromPath(iconPath);",
      "  return icon.isEmpty() ? undefined : icon;",
      "}"
    ];
    const helper = helperLines.join("\n");
    next = next.replace(anchor, helper);
  }

  const browserWindowAnchor = 'const window = new BrowserWindow({';
  if (!next.includes('icon: resolveRoleRadarIcon()')) {
    if (!next.includes(browserWindowAnchor)) throw new Error('Could not locate BrowserWindow options.');
    next = next.replace(browserWindowAnchor, `${browserWindowAnchor}\n    icon: resolveRoleRadarIcon(),`);
  }

  // Desktop notifications inherit the same app brand where the platform supports custom icons.
  if (!next.includes('icon: resolveRoleRadarIcon(), title:')) {
    next = next.replace(
      'new Notification({ title: title.slice(0, 120), body: body.slice(0, 240) }).show();',
      'new Notification({ title: title.slice(0, 120), body: body.slice(0, 240), icon: resolveRoleRadarIcon() }).show();'
    );
  }
  return next;
});

console.log('RoleRadar brand assets are connected to the renderer, favicon, Electron window, notifications, and installer configuration.');

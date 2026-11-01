RoleRadar Electron main-process TypeScript fix

Replace:
  apps/desktop/src/main/index.ts

Fixes:
- Electron 45 clipboard.readText() and writeText() now awaited (Promise API).
- Electron WebContents 'console-message' listener uses positional arguments:
  event, level, message, line, sourceId.
- Keeps existing renderer diagnostics, DevTools shortcuts, navigation guards,
  IPC validation, and managed-service lifecycle logic.

Apply from the RoleRadar repository root:
  unzip -o ~/Downloads/RoleRadar-electron-main-typecheck-fix.zip -d .
  pnpm --filter @roleradar/desktop typecheck

# RoleRadar brand integration patch

This patch wires the previously supplied brand assets into the running application. It preserves the existing routes, API contracts, database models, feature behavior, and Lucide navigation/action icons.

## Integrated surfaces

- Sidebar: imports and renders `logo-light.svg` with the existing workspace subtitle.
- Global notices: uses the custom success/error status marks.
- Resume library: uses the supplied DOC file-type mark for saved resume entries.
- Backup workspace: uses the supplied JSON file-type mark for the backup export card.
- Renderer/web: links the SVG/ICO/PNG favicon family, Apple touch icon, and web manifest from the Vite public directory.
- Electron: loads `build/icon.png` in development and the `app-icon.png` extra resource when packaged; uses the same icon for desktop notifications where supported.
- Installer: Electron Builder config points Linux, Windows, and macOS builds at their corresponding icon formats.
- The existing Lucide system remains the source for normal navigation and actions to avoid visual inconsistency. All additional file-type and status SVGs remain available under `src/renderer/src/assets/icons/`.

## Apply

Extract this ZIP at the repository root, then run:

```bash
node scripts/apply-brand-integration.mjs
pnpm --filter @roleradar/contracts build
pnpm --filter @roleradar/desktop typecheck
pnpm --filter @roleradar/api typecheck
```

The script is idempotent and checks each known source anchor before changing it. It will stop with an error instead of silently rewriting an unexpected file. It does not edit `.env`, dependencies, API contracts, MongoDB schemas, Redis settings, or search behavior.

## Asset paths

- `apps/desktop/build/` — Electron Builder icons and tray asset
- `apps/desktop/src/renderer/public/` — favicons, Apple touch icon, web manifest
- `apps/desktop/src/renderer/src/assets/brand/` — app mark and light/dark wordmarks
- `apps/desktop/src/renderer/src/assets/icons/file-types/` — PDF, DOC, XLS, CSV, JSON
- `apps/desktop/src/renderer/src/assets/icons/status/` — success, info, warning, error

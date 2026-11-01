# RoleRadar Brand & Icon Kit

A restrained premium identity built around a white R monogram and a cyan radar sweep on a deep-navy tile. The design is intended to remain recognizable at 16px and on desktop launchers.

## Included files and exact destinations

### Electron / installer icons

Already placed in `apps/desktop/build/`:
- `icon.svg` — vector master.
- `icon.png` — 1024×1024 source icon.
- `icon.ico` — multi-size Windows icon (16–256).
- `icon.icns` — multi-size macOS icon (16–1024).
- `icons/{16x16,24x24,32x32,48x48,64x64,96x96,128x128,256x256,512x512}.png` — Linux icon set.
- `tray.svg` and `tray.png` — optional small tray asset.

`electron-builder.yml` is updated to read the icon resources from `build/`, use the Linux PNG set, and use the native ICNS/ICO formats on macOS/Windows. The PNG is also copied to packaged resources as `app-icon.png` for optional runtime use.

### Web / renderer favicon

Already placed in `apps/desktop/src/renderer/public/`:
- `favicon.svg`, `favicon.ico`, `favicon-16x16.png`, `favicon-32x32.png`, `favicon-48x48.png`, `favicon-64x64.png`, `favicon-128x128.png`, `favicon-256x256.png`, `favicon-192x192.png`, `favicon-512x512.png`.
- `apple-touch-icon.png` (180×180) and `site.webmanifest`.

`apps/desktop/src/renderer/index.html` includes relative favicon references. Relative paths are deliberate so they work with both the Vite dev server and the packaged `file://` renderer.

### In-app brand logo

Already placed in `apps/desktop/src/renderer/src/assets/brand/`:
- `brand-mark.svg` — navy symbol for light surfaces.
- `brand-mark-inverse.svg` — white symbol for dark surfaces.
- `logo-light.svg` — horizontal logo for light surfaces.
- `logo-dark.svg` — horizontal logo for dark surfaces.

Example (from a renderer component):

```tsx
import logo from "./assets/brand/logo-light.svg";

<img src={logo} alt="RoleRadar" width={156} height={36} />
```

Adjust the relative import based on the component's folder. Use `logo-dark.svg` on dark panels and `brand-mark.svg` when the full wordmark does not fit. The supplied logo files do not force a layout change; insert them into the existing sidebar/header where appropriate.

### Supporting interface assets

`apps/desktop/src/renderer/src/assets/icons/file-types/` contains PDF, DOC, XLS, CSV and JSON SVG marks. `.../status/` contains success, info, warning and error SVG marks. Your current UI already depends on `lucide-react`; keep using Lucide for normal navigation/action icons rather than replacing the existing component icon system with raster images.

## Apply to an existing checkout

Extract the ZIP at the repository root (the folder containing `pnpm-workspace.yaml`):

```bash
unzip -o RoleRadar-brand-kit.zip -d .
pnpm --filter @roleradar/desktop typecheck
pnpm dev
```

For an installer build, use the existing project build command after checking that its API and AI sidecars are prepared. electron-builder reads static icon resources from the app's build-resources directory.

## Brand palette

- Midnight: `#061735`
- Deep navy: `#092B68`
- Primary blue: `#1664D9`
- Radar cyan: `#22CBE8`
- Light background: `#F5F8FC`
- Text navy: `#102A55`

The preview board in `preview/` is a visual reference only; do not use the entire board as a favicon or application icon.

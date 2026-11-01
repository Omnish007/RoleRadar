# RoleRadar

RoleRadar is a local-first Electron desktop workspace for researching job openings and managing a personal application pipeline. It is a single-user desktop product; SaaS accounts, cloud sync and billing are intentionally out of scope.

## Technology

- Electron 45 + electron-vite 6
- React 19 + TypeScript + Tailwind CSS 4 + shadcn/ui primitives
- NestJS 12 + MongoDB 8 + Mongoose 9
- Redis 7 + BullMQ 5
- Optional Python FastAPI + LangGraph 1 + Ollama
- Shared Zod contracts compiled as a workspace package

## Implemented modules

- Cross-platform search builder for LinkedIn, Naukri, Indeed and Wellfound.
- Platform-specific query plans, keyword variations, native-filter instructions and query validation.
- Natural-language search-intent extraction through local Ollama.
- Search profiles, built-in templates and search-launch history.
- Manual opportunity capture, duplicate URL detection, application stages and status history.
- Recruiter and company records, preferred/avoid employer lists, interview rounds and follow-up reminders.
- Local resume version library with AI matching against saved resume text.
- Notifications, local analytics and weekly search goals.
- JSON backup/export/import, daily automatic backups and retention of the newest 30 automatic backups.
- Electron quick-capture shortcut (`Ctrl+Shift+J`) and search-builder shortcut (`Ctrl/Cmd+K`).

## Prerequisites

- Node.js 22.22.3+ or 24.15.0+ (Node 24 LTS recommended)
- pnpm 10.20+
- Docker Engine and Docker Compose plugin 2.17+
- Python 3.11+ for the optional AI service
- Ollama and a compatible local model for AI features

## Setup on Ubuntu (development)

```bash
corepack enable
pnpm install
cp .env.example .env
pnpm dev:infra
```

Start Electron and NestJS together:

```bash
pnpm dev
```

The root development command builds `@roleradar/contracts` before starting either watcher. The desktop development script runs `install-electron --no` before `electron-vite`: Electron 42+ no longer downloads its runtime in a package `postinstall` hook, while `electron-vite` expects the runtime path to exist. The workspace also synchronizes injected workspace dependencies after `build` scripts, so the renderer and API resolve the generated contract output reliably. Use `pnpm` for workspace commands (rather than `npm run`) to avoid npm warnings for pnpm-only configuration. The contracts package publishes separate ESM and CommonJS builds: the Electron renderer resolves the ESM export, while the NestJS API resolves the CommonJS export. This avoids loading CommonJS output as browser ESM and preserves the API runtime format.

The API uses TypeScript `NodeNext` module detection while remaining a CommonJS application. This is intentional: NestJS 12 publishes ESM-only framework packages, and supported modern Node.js releases can load them from CommonJS with `require(esm)`. Do not add `"type": "module"` to `apps/api/package.json` unless you also migrate its relative imports to explicit `.js` extensions and update the runtime bootstrap.

Saved-search profiles expose `collection` through the API and backup JSON, but persist the value as `collectionName` in MongoDB because `collection` is a reserved Mongoose document key. The API migrates legacy saved-profile records automatically when it starts.

Or start them separately in different terminals:

```bash
pnpm dev:api
pnpm dev:desktop
```

Optional local AI service:

```bash
ollama serve
ollama pull qwen2.5:3b
cd apps/ai-service
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --host 127.0.0.1 --port 8010
```

The AI service reads `OLLAMA_BASE_URL` and `OLLAMA_MODEL` from the repository root `.env`. Search compilation and job tracking do not require AI.

## Build and quality checks

```bash
pnpm quality
pnpm --filter @roleradar/desktop build
```

Before packaging, create and populate the AI build environment (the installer bundles the Python AI service):

```bash
python3 -m venv apps/ai-service/.venv
apps/ai-service/.venv/bin/pip install -r apps/ai-service/requirements.txt
pnpm --filter @roleradar/desktop build
```

The desktop build compiles the NestJS API, deploys its production workspace dependencies into a sidecar folder, freezes the Python AI service with PyInstaller, and creates Linux AppImage and `.deb` installers. The installed app's Settings page starts MongoDB and Redis with Docker Compose, waits for container health, then starts the NestJS API and optional Python AI sidecar. The API readiness check requires MongoDB ping and Redis queue access; Python AI availability and Ollama availability are reported independently because AI is optional. Ollama remains a user-installed local dependency.

## Architecture

- `apps/desktop`: Electron main/preload and React renderer.
- `apps/api`: NestJS feature modules, REST endpoints, MongoDB persistence and BullMQ workers.
- `apps/ai-service`: optional Python graph and Ollama integration.
- `packages/contracts`: shared Zod schemas and TypeScript contracts.

Search compilation is deterministic TypeScript. AI extracts structured intent and analyzes only text supplied by the user; it does not invent missing salary, employer, location or experience facts. LangGraph is used for the staged search-intent workflow; one-step AI tools call Ollama directly.

## Platform behavior and compliance

- LinkedIn: Boolean operators are used for main-search/post discovery; Jobs search uses a natural-language prompt plus manual native filters.
- Naukri: separate focused keyword variations; no assumption that LinkedIn Boolean syntax is portable.
- Indeed: Boolean and title-focused variants using documented search grammar.
- Wellfound: role/keyword strategy plus native filter guidance, including remote-country eligibility checks.

The app copies a query and opens an official platform entry point. The user completes searches manually. There is no credential collection, scraping, automated profile harvesting or auto-application. Do not add platform automation without documented permission and terms review.

## Local data and privacy

MongoDB and Redis ports are bound to loopback. The NestJS API listens on `127.0.0.1` and uses request validation, source URL allowlists, bounded payloads and a restricted Electron IPC bridge. Electron uses context isolation, sandboxing and disabled Node integration.

Automatic backups are stored in `$HOME/.local/share/roleradar/backups` by default (or `BACKUP_DIR` when configured), with the 30 most recent automatic snapshots retained. Packaged API and AI sidecar stdout/stderr are written to Electron's application log directory under `roleradar/`; each service log is rotated at approximately 5 MB and retains one previous file. JSON exports are not encrypted and can contain recruiter contact details and private notes; store them accordingly.

## Design system

The interface uses a neutral light workspace, clear typographic hierarchy, whitespace-led grouping and restrained blue actions. See `docs/DESIGN_SYSTEM.md` for the palette, contrast and accessibility requirements. The UI uses a small set of local shadcn-style primitives; not every input has been migrated to a Radix component yet.

## Release validation boundary

The source includes a Linux installer build and a packaged NestJS sidecar, but a production release still needs to be built and exercised on the target Ubuntu distribution with Docker, MongoDB/Redis startup, Ollama, notification permissions and real user-data backup/restore. The current execution environment does not have Docker or npm registry access, so the dependency install, complete semantic TypeScript typecheck, Electron runtime and final installer cannot be verified here. Python unit tests and repository structural checks are run separately.

# Research notes — 1 November 2026

## Job-platform search behavior

### LinkedIn
- The general LinkedIn search grammar supports uppercase `AND`, `OR`, `NOT`, quoted phrases and parentheses.
- LinkedIn does not officially support wildcard `*` and square/curly/angle brackets in Boolean search. Avoid assuming Google syntax or leading `+`/`-` syntax is portable.
- Job search should be compiled separately from general search. Current job discovery supports natural-language search descriptions; use platform-native filters manually instead of pretending a Boolean expression controls all job filters.
- Hiring-post discovery is a distinct general-search/Posts strategy. Do not add location to the Boolean expression by default when a separate location filter is available; overly strict post strings can lose recall.

### Naukri
- Use separate focused keyword variations and native filters for location, experience, freshness, salary and work mode.
- Search behavior changes across UI surfaces and versions. The app warns rather than claiming unsupported Boolean operators.

### Indeed
- Use phrase quoting, `AND`, `OR`, `-term` exclusions and the documented `title:` / `company:` patterns where relevant.
- Search behavior can vary by locale. Always allow query editing and user validation.

### Wellfound
- Treat roles, location, compensation, equity, employment type, experience, company stage/size and keywords as structured search dimensions.
- Remote eligibility must be checked against countries a company hires from, not just its headquarters.

## Query-quality principles

1. Prefer several targeted variations over an over-constrained mega-query.
2. Separate required skills from preferred skills.
3. Make the primary title explicit and alternatives genuinely equivalent.
4. Do not put every filter into query text if the platform has a native filter.
5. Keep hiring phrases separate from ordinary job queries.
6. Explain unsupported filters and manual actions in every generated plan.
7. Never guarantee that search results are current, complete or still open; the platform controls result ranking and listing status.

## AI architecture

- Ollama structured output uses JSON Schema mode. All returned values are validated again with Pydantic and shared Zod contracts.
- AI prompts treat user-provided descriptions as source data, not instructions that can override system tasks.
- Search compiler decisions remain deterministic TypeScript. AI is a parser/assistant, not the query compiler.
- LangGraph is used for normalize → extract → validate because this has multiple explicit stages. Simple AI actions use a direct Ollama call.

## App and infrastructure

- Electron: context isolation, sandbox, disabled Node integration, restrictive CSP, validated IPC sender, protocol/host allowlists.
- NestJS: feature modules and DI, Zod for shared runtime contracts, centralized exception mapping.
- MongoDB: indexes on frequent search and opportunity fields; unique indexes need to be created in a real migration before a production release.
- BullMQ: bounded retries, exponential backoff and deterministic job IDs for idempotent reminders.
- Redis and MongoDB are loopback-bound for local-only use; do not expose unauthenticated local services on a LAN.

## Product and design philosophy

- Apple HIG: prioritize clarity, consistency, hierarchy, predictable behavior and content over decorative UI.
- Google Material Design: use semantic color roles, consistent component states, accessible contrast, and predictable interaction feedback.
- RoleRadar uses a light neutral canvas, white surfaces, restrained blue primary actions, readable dark text, subtle dividers and compact but legible forms.
- Color must not be the only carrier of status. Preserve keyboard focus and use accessible text labels.

## Sources

- LinkedIn Help — Boolean search: https://www.linkedin.com/help/linkedin/answer/a524335
- LinkedIn Help — Search: https://www.linkedin.com/help/linkedin/answer/a523136
- Indeed Job Seeker Help — Advanced search: https://support.indeed.com/hc/en-us/articles/4409340503316-What-is-advanced-job-search
- Wellfound — Search jobs: https://help.wellfound.com/article/1116-how-to-search-for-jobs-on-wellfound
- Wellfound — Remote work and hiring locations: https://help.wellfound.com/article/1117-remote-job-search
- Ollama structured outputs: https://docs.ollama.com/capabilities/structured-outputs
- LangGraph persistence: https://docs.langchain.com/oss/python/langgraph/persistence
- Electron security: https://www.electronjs.org/docs/latest/tutorial/security
- NestJS queues: https://docs.nestjs.com/techniques/queues
- BullMQ retrying failed jobs: https://docs.bullmq.io/guide/retrying-failing-jobs
- shadcn/ui Vite setup: https://ui.shadcn.com/docs/installation/vite
- Apple Human Interface Guidelines: https://developer.apple.com/design/human-interface-guidelines/
- Material Design 3 color roles: https://m3.material.io/styles/color/roles


## Service startup and health
- Docker Compose starts MongoDB and Redis with `up --wait`; startup does not proceed until both container health checks pass.
- `/api/health/live` is a liveness endpoint that only confirms the NestJS process is serving requests.
- `/api/health` reports MongoDB, Redis, Python AI and Ollama diagnostics.
- `/api/health/ready` is a readiness endpoint; it returns HTTP 503 until MongoDB responds to `ping` and Redis queue operations succeed.
- The desktop supervisor polls readiness before reporting the API as started. In development, the API is started with `pnpm dev:api`; the desktop checks it rather than spawning a competing NestJS watch process.
- Python AI startup is optional. The service may be healthy while Ollama is unavailable; that state is surfaced separately and does not block search or opportunity management.
- Sidecar starts are guarded against concurrent duplicate launches, bounded by timeouts and terminated during application shutdown.

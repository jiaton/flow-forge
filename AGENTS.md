# Repository Guidelines

**Architecture:** See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for project structure, module system, and patterns.

## Coding Standards

**Architecture:**
- Keep functions pure and stateless when possible
- Avoid global shared state
- Don't hardcode service names or depend on specific services
- **New modules must be fully modular** — no edits to shared files (`ipcHandlers.js`, `preload.js`, `main.js`)
- Frontend modules: auto-discovered from `src/modules/*.ts`
- Backend modules: auto-discovered from `electron/<module>/ipc-handlers.js` (export `register()`)
- Frontend calls backend via `window.electronAPI.modules.invoke('<module>:<method>', ...args)`
- Module must be listed in `config/app.config.yaml` under `modules:` to appear in sidebar

**Code Quality:**
- Max function length: 50 lines
- Max file length: 450 lines
- Prefer composition over inheritance
- Refactor instead of workarounds
- Write self-documenting code
- Centralize config (file paths, constants, loggers)
- Make file names specific, not generic

**Constants & Type Safety:**
- **NEVER use hardcoded string literals for statuses, states, or enums**
- **ALWAYS import from centralized constant definitions** (`src/shared/constants/`)
- Before writing any status/state string, search for existing constant definitions
- Use TypeScript `as const` for type-safe constants
- Example: Use `SERVICE_STATUS.RUNNING` instead of `'running'`
- Backend and frontend MUST share the same constants (single source of truth)
- **Drizzle ORM returns camelCase** — always use `row.serviceId`, never `row.service_id`
  - DB columns are snake_case (`service_id`), but Drizzle maps them to camelCase in JS
  - This applies to all query results, including `.get()`, `.all()`, and joins
- **SQLite has no boolean type** — `integer` columns store 0/1, but JS code passes `true/false`
  - Repos must normalize `boolean → integer` before validation (e.g., `if (typeof val === 'boolean') val = val ? 1 : 0`)
  - Do this in the repo's `save()` method, before calling `validate()`
  - Applies to: `detached`, `dismissed`, and any future boolean-like integer columns
- **drizzle-zod is the single source of truth** for DB validation schemas
  - Never hand-write Zod schemas for DB operations — they're auto-generated from Drizzle tables
  - All DB validators live in `electron/schemas/database/index.js`
  - If validation fails, fix the data at the source, don't loosen the schema

**UI Library Usage:**
- Maximize use of the project's UI library — use its components, APIs, and styling system directly
- Don't build custom abstractions or wrappers over what the library already provides
- Search for existing components/utilities before creating new ones

**Error Handling:**
- No silent errors
- All async operations must include error handling

**Migration:**
- Migration code should be one-time and deletable
- Persistence in YAML files, DB only for local state/settings
- Breaking changes acceptable during early development
- **No database migrations** — use version-check + drop-and-recreate strategy
- Bump `SCHEMA_VERSION` in `electron/database/schema/meta.js` on any schema change
- DB stores only disposable preferences; safe to delete and recreate anytime

**Documentation:**
- Generated docs go to `docs/tmp/`
- Keep docs concise - introduce architecture, let developers explore code
- **Update `docs/ARCHITECTURE.md` for any architectural changes**

**Testing:**
- Generated one-time test code goes to `docs/tmp/tests/`

## Development

**Commands:**
- `npm run electron:dev` - Vite + Electron dev workflow
- `npm run electron:dev:log` - Same as above, but tees output to `/tmp/flowforge-dev.log` for AI agent debugging
- `npm run test:all` - Schema validation + Electron smoke tests
- `npm run build:mac` - Production build + macOS packaging

**AI Agent Debugging:**
- Use `npm run electron:dev:log` so the agent can read runtime logs via `tail /tmp/flowforge-dev.log`
- The dev server is long-running — the agent reads the log file while the developer reproduces issues in the app
- Console/tee output is `info` level (clean). For `debug` level, read `./logs/main.log`

**Style:**
- TypeScript-first with React function components
- Two-space indentation, single quotes, trailing semicolons
- `PascalCase` for components/classes, `camelCase` for functions/variables
- Hooks prefixed with `use`, descriptive filenames
- Follow ESLint output

## Configuration & Security

- Never commit real YAML configs - edit `config/docs/` and `config.templates/`
- Secrets via runtime environment or user-level config only
- Validate new config keys through schema tests
- **Service YAML reference:** `config/docs/SERVICE-DEFINITION.md`
- **Schema source of truth:** `electron/schemas/config/service.js`
- **Global settings schema:** `electron/schemas/config/global-settings.js`
- When generating service configs, read `SERVICE-DEFINITION.md` for the full field reference

## Commits & PRs

- Short, imperative commit subjects
- Conventional commits preferred: `feat:`, `fix:`, `chore:` with optional scope
- Keep commits focused (UI, backend, or config)
- No built artifacts in commits (`dist/`, `release/`)
- PRs: describe change, risks, test commands, link issues
- Include screenshots/clips for UI changes
- **Tag releases** after major changes: `git tag v<major>.<minor>.<patch>` + `git push origin <tag>`
  - Pushing a `v*` tag triggers the GitHub Actions release workflow (builds DMG)
  - Bump major: breaking changes or new modules
  - Bump minor: new features within existing modules
  - Bump patch: bug fixes and polish

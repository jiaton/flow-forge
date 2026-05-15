# FlowForge Architecture

> **Quick reference for where to find and add code**

## Directory Structure

```
├── config/                      # YAML configuration files (user-editable)
│   ├── app.config.yaml         # Module definitions & app settings
│   ├── team-presets.yaml       # Team configurations
│   ├── global-settings.yaml    # IDE, terminal, file manager settings
│   ├── services/               # Modular service definitions (auto-discovered)
│   │   ├── backend/           # Backend services
│   │   ├── frontend/          # Frontend applications
│   │   ├── microservices/     # Microservices
│   │   └── infrastructure/    # Infrastructure services
│   ├── routines/              # Cross-service routine definitions
│   ├── examples/              # Example configurations
│   │   ├── *.yaml            # Example config files
│   │   └── services/         # Example service definitions
│   └── docs/                  # Configuration documentation
│       ├── QUICK-START.md
│       ├── SERVICE-DEFINITION.md
│       └── TROUBLESHOOTING.md
├── electron/                    # Electron backend
│   ├── main.js                 # App entry point
│   ├── module-loader.js        # Backend module auto-discovery
│   ├── database/               # SQLite database (user preferences only)
│   ├── service-orchestration/  # Service management
│   │   ├── config/
│   │   │   ├── service-loader.js  # Dynamic service discovery
│   │   │   └── routine-loader.js  # Reads config/routines/*.yaml
│   │   ├── routines/
│   │   │   └── routine-runner.js  # Script builder + run tracking
│   │   ├── utils/
│   │   │   ├── pid-manager.js     # PID file ops + async port detection
│   │   │   └── process-stats.js   # Async CPU/memory stats
│   │   ├── runtime-monitor.js     # 2-tier status detection
│   │   ├── state-manager.js       # In-memory state + history
│   │   └── lifecycle.js           # Start/stop/force-stop
│   ├── pty-manager.js             # PTY sessions + optional log capture
│   └── utils/                  # Backend utilities
│       ├── configInitializer.js   # First-run config setup
│       └── configPaths.js         # Path resolution
└── src/                        # React frontend
    ├── core/                   # Framework/platform code
    │   └── module-system/      # Module system core (registry, loader, types)
    ├── modules/                # Module definitions (*.ts files) - actual features
    ├── components/             # UI components (organized by feature)
    │   └── ServiceOrchestrator/
    │       ├── RoutinesDialog.tsx      # Routine list + schedule + history
    │       ├── RoutineProgress.tsx     # Progress sidebar for running routines
    │       ├── CronSchedulePicker.tsx  # Visual cron schedule builder
    │       ├── ServiceContextMenu.tsx  # Right-click menu (quick commands + routines)
    │       └── InteractiveTerminal.tsx # PTY terminal with keepAlive + log capture
    ├── hooks/                  # Custom React hooks (grouped by module)
    │   ├── service-orchestrator/  # Service orchestration hooks
    │   ├── git-manager/           # Git manager hooks
    │   └── shared/                # Shared/common hooks
    ├── services/               # Service layer (grouped by module)
    │   ├── service-orchestrator/  # ServiceManager, etc.
    │   └── git-manager/           # Git service, etc.
    ├── stores/                 # Zustand state management
    ├── shared/                 # **Shared code between frontend & backend**
    │   └── constants/          # **Single source of truth for all constants**
    │       ├── service.ts      # Service status, process types, detection methods
    │       └── index.ts        # Barrel exports
    ├── lib/                    # Utilities, constants, loaders
    │   ├── constants/          # **Re-exports from shared/ for backward compatibility**
    │   └── loaders/            # Config loaders (config, team-config, file)
    ├── types/                  # TypeScript type declarations
    └── theme/                  # MUI theme configuration
```

## Core Concepts

### JavaScript Backend & Shared Constants

**Background:** FlowForge uses a hybrid architecture with an Electron backend (Node.js) and React frontend. The backend uses plain JavaScript (`.js`) with ES modules. Constants are shared between frontend and backend via a single source of truth.

**Current Architecture:**
- **Backend**: JavaScript ES modules (`electron/**/*.js`)
- **Frontend**: TypeScript with React (`src/**/*.ts`, `.tsx`)
- **Shared Constants**: Single source of truth in `src/shared/constants/`

**Key Principles:**
1. **NEVER use hardcoded strings** for statuses, states, or enums
2. **ALWAYS import from centralized definitions** (`src/shared/constants/`)
3. **Backend and frontend share the same constants** (no duplication)
4. Use `SERVICE_STATUS.RUNNING` instead of `'running'`

**Shared Constants Location:**
```
src/shared/constants/
├── service.ts    # SERVICE_STATUS, PROCESS_TYPE, DETECTION_METHOD, etc.
└── index.ts      # Barrel export
```

**Import Examples:**
```javascript
// Backend (Electron) — direct relative import
import { SERVICE_STATUS, PROCESS_TYPE } from '../../src/shared/constants/service.js';

// Frontend (React)
import { SERVICE_STATUS } from '../../shared/constants/service';
```

**⚠️ WARNING: Do NOT run `npx tsc` on the electron/ directory.**
There is a stale `electron/tsconfig.json` from a previous TypeScript migration attempt.
Running tsc will overwrite the hand-edited `.js` files with stale compiled output.
The build system uses `electron-vite` (Vite/Rollup), not tsc.

### Module System
**Modules** are self-contained features that can be enabled/disabled per team.

**Key Files:**
- **Module definitions:** `src/modules/*.ts` - Actual module plugins
- **Module framework:** `src/core/module-system/` - Registry, loader, types
  - `ModuleRegistry.ts` - Central module registry
  - `ModuleConfigLoader.ts` - Loads configs from YAML
  - `types.ts` - TypeScript interfaces

**Important:** Module IDs are standardized:
- **Module ID = Route name = View ID** (no mapping needed)
- Example: Module `service-orchestrator` → route `/service-orchestrator` → viewId `service-orchestrator`

**Module interface** (`src/core/module-system/types.ts`):
```typescript
interface Module {
  // Required
  metadata: {
    id: string;          // Unique kebab-case ID — must equal route
    name: string;        // Display name in sidebar
    description: string; // Short description
    version: string;     // Semantic version (e.g. '1.0.0')
    icon: string;        // Material-UI icon name
    route: string;       // URL route/view ID — must equal id
    enabled: boolean;    // Default enabled state
    order: number;       // Sidebar order (lower = higher); 10-20 core, 20-50 common, 50+ specialized

    // Optional
    teamSpecific?: boolean;      // True if behavior changes per team
    dependencies?: string[];     // Load-order dependencies: 'database' | 'serviceManager' | 'notifications'
    permissions?: string[];      // Future RBAC (not enforced yet)
    badge?: { type: 'count' | 'text' | 'dot'; source?: string; text?: string; color?: string };
  };
  component: React.ComponentType; // Required — the React component to render

  // Optional
  lifecycle?: {
    onLoad?: () => Promise<void> | void;
    onUnload?: () => Promise<void> | void;
    onTeamChange?: (team: string) => Promise<void> | void;
    onEnvironmentChange?: (env: string) => Promise<void> | void;
  };
  getBadge?: () => number | string | null; // Badge value shown in sidebar
}
```

**Auto-discovery:** Any `*.ts` file in `src/modules/` that exports an object with `metadata` and `component` fields is registered automatically — no `App.tsx` or `index.ts` edits needed.

### Component Architecture Pattern

**✅ ALWAYS follow this pattern for new features:**

```
src/modules/my-feature.ts                         ← Module definition
src/components/MyFeature/
  ├── MyFeature.tsx                               ← UI component (presentation only)
  ├── types.ts                                    ← TypeScript types
  └── subcomponents...
src/hooks/my-feature/useMyFeature.ts              ← Custom hook (state & logic)
src/services/my-feature/myFeatureService.ts       ← Service class (API calls, DB operations)
```

**Note:** For shared utilities used across multiple modules, use `src/hooks/shared/` and `src/services/shared/`

**Component responsibilities:**
- **Component**: Render UI, handle user interactions → calls hooks
- **Hook**: Manage state, business logic, orchestration → calls services
- **Service**: API calls, database operations, pure functions

**Example:**
```typescript
// Component
const MyFeature: React.FC = () => {
  const { data, loading, actions } = useMyFeature();
  return <UI onClick={actions.doSomething} />;
};

// Hook
export const useMyFeature = () => {
  const [data, setData] = useState([]);
  const doSomething = async () => {
    const result = await MyFeatureService.fetchData();
    setData(result);
  };
  return { data, loading, actions: { doSomething } };
};

// Service
export class MyFeatureService {
  static async fetchData() {
    return await window.electronAPI.getData();
  }
}
```

## Configuration vs Database

### Layered Configuration System

FlowForge implements a three-tier configuration strategy to support both development and production deployment:

#### Three Configuration Tiers

```
1. BUNDLED TEMPLATES (config.templates/, read-only)
   ├── Shipped with the application (.dmg, .app bundle, etc.)
   ├── Generic, company-agnostic examples
   ├── Version controlled in git
   └── Source of truth for default configurations

2. USER CONFIG (~/.flowforge/config/, read-write)
   ├── Created on first run from templates (production only)
   ├── User's actual runtime configuration
   ├── User-editable after installation
   └── Platform-specific location (macOS, Windows, Linux)

3. DEV CONFIG (project/config/, gitignored, dev-only)
   ├── Developer's local settings (not in git)
   ├── Contains real company-specific data
   ├── Only used during development
   └── Never shipped in releases
```

#### Configuration Resolution

**Development Mode (`npm run electron:dev`):**
- Primary: Read from `project/config/` (your local configs)
- Fallback: Read from `project/config.templates/` (if file missing)
- User directory: Not used

**Production Mode (packaged .dmg/.app):**
- Primary: Read from `~/.flowforge/config/`
- Fallback: Read from bundled `app.bundle/config.templates/`
- First run: Automatically copies templates → user directory

#### Configuration Files

**YAML Configuration (managed by ConfigManager):**
- Module definitions (`app.config.yaml`)
- Team configurations (`team-presets.yaml`)
- Service definitions (`services/**/*.yaml` - modular, auto-discovered)
- Global settings (`global-settings.yaml` - IDE, terminal, file manager)
- **Modular structure** - each service in its own file with explicit `serviceId`
- **Validated with Zod schemas** on load (`electron/schemas/config/`)

**CRITICAL RULES for Configuration:**

1. **NEVER modify `config/` directly** - This directory contains real local development data and is gitignored
2. **DO NOT include `config/` in git or releases** - These are user-specific runtime configs
3. **For generic examples:** Update `config.templates/` only - this is version controlled and shipped with the app
4. **For new features:** Add template examples to `config.templates/`, users will get them on fresh install
5. **ConfigManager handles everything:** Use `electron/utils/configManager.js` for all config operations

### SQLite Database (user preferences only)
**Technology Stack:**
- **Drizzle ORM** - Type-safe database operations with better-sqlite3
- **Zod** - Runtime validation for all data operations
- **better-sqlite3** - Synchronous SQLite driver optimized for Electron

**Location:** `electron/database/` (created at runtime)
- Module order (user's sidebar arrangement)
- Current view, selected team, sidebar state
- Service states
- Tracked merge/pull requests, Git provider settings
- Routine schedules and run history
- **NOT for configuration data**

**Schema Organization:**
```
electron/
├── database/
│   ├── schema/           # Drizzle ORM schemas (single source of truth)
│   │   ├── app.js       # App settings, team configs, view states, notifications
│   │   ├── service-orchestration.js  # Service state, detached services
│   │   ├── routines.js  # routine_schedules, routine_runs
│   │   ├── git.js       # Git settings, merge requests
│   │   └── meta.js      # Schema versioning
│   └── repositories/    # Repository pattern with Drizzle + Zod
└── schemas/
    ├── config/          # YAML config validation (hand-written Zod)
    ├── database/        # DB validation (auto-generated via drizzle-zod)
    │   └── index.js     # All DB schemas derived from Drizzle tables
    └── ipc/             # IPC payload validation (hand-written Zod)
```

**Database validation:** Uses `drizzle-zod` to auto-generate Zod schemas from Drizzle table definitions.
Drizzle schema is the single source of truth — no hand-written Zod schemas for DB operations.
When changing a Drizzle table, the Zod validation updates automatically.

**Development tip:** Database can be safely deleted anytime - it only stores UI preferences:
```bash
rm -f flowforge.db*  # Will be recreated with defaults
```

## State Management

### Zustand Store
**Location:** `src/stores/dbAppStore.ts`
- Global app state (team, view, sidebar)
- Auto-persists to database
- Team configs loaded from YAML (not DB)

### Local Component State
Use `useState` for:
- UI-only state (modals, tabs, form inputs)
- Temporary state that doesn't need persistence

## Adding a New Module

1. **Create module definition:** `src/modules/my-feature.ts` — copy `MODULE_TEMPLATE.ts` as a starting point
2. **Create component:** `src/components/MyFeature/MyFeature.tsx`
3. **Create hook:** `src/hooks/my-feature/useMyFeature.ts` (if complex logic)
4. **Create service:** `src/services/my-feature/myFeatureService.ts` (if API/DB calls)
5. **Create backend handlers:** `electron/my-feature/ipc-handlers.js` (if backend logic needed)
6. **Add to YAML:** Update `config/app.config.yaml` with module metadata
7. **Team-specific?** Add overrides in `config/team-presets.yaml`

> **Frontend:** No changes to `App.tsx` or `src/modules/index.ts` needed. Modules are auto-discovered via `import.meta.glob` — any lowercase `*.ts` file in `src/modules/` that exports an object with `metadata` and `component` is registered automatically.

> **Backend:** No changes to `ipcHandlers.js`, `main.js`, or `preload.js` needed. Any `electron/<module-name>/ipc-handlers.js` that exports a `register(context)` function is auto-discovered by `electron/module-loader.js` via `import.meta.glob` at build time. Frontend calls via `window.electronAPI.modules.invoke('<module>:<method>', ...args)`.

> **Config:** The module must be listed in `config/app.config.yaml` under `modules:` to appear in the sidebar. The module's code-level `enabled: true` is a default, but the config loader only processes modules defined in YAML.

### Backend Module Convention

Backend modules are discovered at **build time** via `import.meta.glob` in `electron/module-loader.js` (runtime fs scanning doesn't work because electron-vite bundles everything into a single file).

```javascript
// electron/my-feature/ipc-handlers.js
import { ipcMain } from 'electron';

export function register({ mainWindow, configDir }) {
  ipcMain.handle('myFeature:getData', async (_, args) => {
    // Handle operation
    return result;
  });
}
```

```typescript
// Frontend — generic invoke (no preload edit needed)
const result = await window.electronAPI.modules.invoke('myFeature:getData', args);
```

**Optional:** For typed APIs, add explicit bindings in `preload.js` + `src/types/electron.d.ts`. This gives IDE autocomplete but is not required for functionality.

**Excluded directories** (existing infra, not treated as modules): `database`, `service-orchestration`, `utils`, `schemas`.

## Adding a New Service

1. **Create service file:** `config/services/[category]/my-service.yaml`
```yaml
serviceId: "my-service"  # Required: unique identifier
name: "My Service"
type: "Backend API"
description: "What this service does"
port: 8080
path: "$HOME/projects/my-service"

commands:
  start: "cd $HOME/projects/my-service && npm start"
  stop: "pkill -f 'my-service'"
  check: "pgrep -f 'my-service'"

environments:
  local: "http://localhost:8080"
```

2. **No code changes needed** - services are auto-discovered recursively
3. **See:** `config/docs/SERVICE-DEFINITION.md` for complete field reference

## Adding a New Team

1. **Edit YAML:** Add team entry in `config/team-presets.yaml`
```yaml
teams:
  NEW:
    name: New Team
    description: "Team description"
    color: '#FF5722'
    icon: Star
    presetServices:  # Reference services by serviceId
      - "my-service"
      - "api-service"
    modules:
      service-orchestrator: { enabled: true }
```

2. **No code changes needed** - teams are loaded from YAML

## Common Tasks

| Task | Location |
|------|----------|
| Add module (frontend) | `src/modules/my-feature.ts` (auto-discovered, no registration step) |
| Add module (backend) | `electron/my-feature/ipc-handlers.js` (auto-discovered, export `register()`) |
| Add service | `config/services/[category]/service-name.yaml` |
| Add routine | `config/routines/routine-name.yaml` |
| Add team | `config/team-presets.yaml` |
| Add UI component | `src/components/FeatureName/` |
| Add business logic | `src/hooks/feature-name/useFeatureName.ts` |
| Add API/DB calls | `src/services/feature-name/featureNameService.ts` |
| Add app config | `config/app.config.yaml` |
| Add database table | `electron/database/schema.js` |
| Add IPC handler (legacy) | `electron/ipcHandlers.js` |
| Add IPC handler (modular) | `electron/<module>/ipc-handlers.js` (preferred) |
| Add constants | `src/core/constants/*.ts` |

## Electron IPC Pattern

**Frontend → Backend:**
```typescript
// Frontend
const result = await window.electronAPI.myOperation(params);

// Backend (electron/ipcHandlers.js)
ipcMain.handle('myOperation', async (event, params) => {
  // Handle operation
  return result;
});

// Preload (electron/preload.js)
myOperation: (params) => ipcRenderer.invoke('myOperation', params),
```

## Database Schema Changes

**Strategy: Version-check + drop-and-recreate (NO migrations)**

The database stores only disposable user preferences (sidebar state, selected team, etc.).
It is safe to delete and recreate at any time. This eliminates migration complexity.

**How it works:**
1. `SCHEMA_VERSION` is defined in `electron/database/schema/meta.js`
2. On app startup, the stored version in `schema_info` is compared to the code's version
3. **Match** → proceed normally
4. **Mismatch or missing** → delete DB file, recreate from current schema with defaults

**When changing the schema:**
1. Update the Drizzle schema definition in `electron/database/schema/*.js`
2. Update the matching `CREATE TABLE` SQL in `electron/database/schema.js`
3. Bump `SCHEMA_VERSION` in `electron/database/schema/meta.js`
4. That's it — no migration files, no drizzle-kit generate

**This works for all scenarios:**
- **Fresh install** (new Mac) → no DB exists → created with current schema
- **App update** → schema version mismatch → DB deleted and recreated
- **Developer pulls new code** → same as app update

**What NOT to do:**
- Do not use `drizzle-kit generate` for migrations
- Do not create migration SQL files
- Do not add migration-related entries to `extraResources`

## Architecture Compliance

### ✅ Modules Following the Pattern
These modules properly implement hooks + services:
- **Service Orchestrator** - `hooks/service-orchestrator/*`, `services/service-orchestrator/ServiceManager`
- **Git Manager** - `hooks/git-manager/useGitLab`, `services/git-manager/gitService`

### 🚧 Placeholder Modules
These modules are simplified placeholders:
- **Visual JSON Editor** - Generic utility module (placeholder component only)
- **Flow Visualizer** - Generic utility module (placeholder component only)

### ⚠️ Legacy Modules (Company-Specific)
These modules are from the original migration and should be removed or replaced:
- **Teamspace Manager** - Company-specific functionality (placeholder)
- **Invoice Builder** - Company-specific functionality (placeholder)

**When implementing a placeholder module:**
1. Create custom hook: `src/hooks/module-name/useModuleName.ts`
2. Create service class: `src/services/module-name/moduleNameService.ts`
3. Replace placeholder component with full implementation
4. Follow Component → Hook → Service pattern

**Note:** Notifications module is disabled (topbar-only, not a sidebar module)

## Service Orchestration Architecture

### Routines System

Routines are composable, rerunnable batch operations across services.

**Design:**
- **Per-service routines** defined in service YAML (`routines:` key) — standardized action names
- **Cross-service routines** defined in `config/routines/*.yaml` — chain actions across services
- **Schedule/preferences** stored in DB (`routine_schedules` table) — visual cron picker in UI
- **Run history** stored in DB (`routine_runs` table) with log files
- Commands run in user's login shell (zsh -l) so aliases and env vars work

**Two step types in routine YAML:**
```yaml
# Service action — runs a named routine from service YAMLs
- action: update
  services: all          # or [web-app, graphql-api]

# Global run — arbitrary command in a directory
- run: gbx && ac
  dir: ~/dev/backend-api
```

**Execution model:**
- All steps run **sequentially in a single PTY shell session**
- `buildRoutineScript()` concatenates steps into one shell script
- Each command gets `##STEP:N:START##` / `##STEP:N:DONE:$?##` markers for progress tracking
- "all" is resolved to concrete service names at build time
- Users can select/deselect individual steps via checkboxes before running

**Terminal management:**
- Each routine runs in a persistent PTY terminal (survives dialog close)
- Multiple routine terminals can be active simultaneously (stored in a Map)
- Split button in header: main click → routines list, dropdown arrow → active terminals
- Minimize (—) hides dialog, Close (×) kills PTY
- `keepAlive` flag on InteractiveTerminal prevents PTY kill on unmount

**Progress sidebar:**
- 240px sidebar next to terminal shows step-by-step progress
- Parses `##STEP` markers from PTY data stream in real time
- Icons: ⏳ pending → ▶ running → ✅ success / ❌ failed
- Progress bar at top with completion count

**Log capture:**
- PTY output written to `routine-logs/{routineId}-{timestamp}.log` via `pty-manager.js`
- ANSI codes stripped for clean log files, colors preserved in terminal
- Run history viewable in expanded routine view with inline log viewer

**Key files:**
- `electron/schemas/config/routine.js` — Zod schema for routine YAML
- `electron/service-orchestration/config/routine-loader.js` — Reads `config/routines/*.yaml`
- `electron/service-orchestration/routines/routine-runner.js` — Script builder + run tracking
- `electron/database/schema/routines.js` — `routine_schedules` + `routine_runs` tables
- `electron/database/repositories/routines/` — Schedule + run repos
- `src/hooks/service-orchestrator/useRoutines.ts` — Frontend hook
- `src/components/ServiceOrchestrator/RoutinesDialog.tsx` — Routine list + schedule + history
- `src/components/ServiceOrchestrator/RoutineProgress.tsx` — Progress sidebar
- `src/components/ServiceOrchestrator/CronSchedulePicker.tsx` — Visual cron builder

### Status Detection System

FlowForge uses a **2-tier async detection system** for service status monitoring:

**Tier 1: PID File Check** (sync, ~1ms)
- Fast path using `/tmp/{serviceId}.pid` files
- PID files store: `{pid, workingDir, timestamp}`
- Validates process exists via `process.kill(pid, 0)`
- OS-managed (auto-cleanup on reboot)

**Tier 2: Port-Based Detection** (async, ~10-50ms)
- Uses `lsof -ti:PORT` via async `execFile` (non-blocking)
- Self-healing: writes PID file when port-based PID discovered
- Startup timeout: if STARTING for >2 min with live process but no port, marks as ERROR

**Status determination logic:**
1. Port listening → `RUNNING`
2. State is STARTING + process alive + <2 min → `STARTING`
3. State is STARTING + process alive + >2 min → `ERROR` (check logs for build errors)
4. Otherwise → `IDLE`

**Key Files:**
- `electron/service-orchestration/utils/pid-manager.js` - PID file ops + async `findPidByPort`
- `electron/service-orchestration/runtime-monitor.js` - Status detection logic
- `electron/service-orchestration/state-manager.js` - In-memory state + history
- `electron/service-orchestration/lifecycle.js` - Start/stop + 3-tier stop (process → PID → port)
- `electron/service-orchestration/utils/process-stats.js` - Async CPU/memory stats

**Performance note:** All shell commands (`lsof`, `ps`) use async `execFile` to avoid blocking
Electron's main thread. This prevents UI lag during status polling and stats collection.

## Frontend Conventions

- **MUI components used directly** — no custom wrapper layers around MUI primitives
- **Style with `sx` prop and theme tokens** (e.g., `'primary.main'`, `'divider'`) — not `styled()` or CSS modules
- **Import icons from `@mui/icons-material`** directly
- **`React.FC<Props>` with default exports** for all components
- **No HOCs** — use hooks for shared logic

## Key Principles

1. **Module IDs are uniform** - No mapping tables, ID = route = view
2. **Configuration = YAML**, **Preferences = Database**
3. **Always use hooks + services pattern** for new features
4. **Module system** for all major features
5. **Team-specific** configurations via YAML overrides
6. **Database** only for user state, never for configuration
7. **IPC** for all Electron ↔ React communication
8. **Delete database freely** during development - it's just UI preferences

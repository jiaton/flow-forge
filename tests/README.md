# Tests

This directory contains test scripts for FlowForge.

## Available Tests

### 1. Schema Validation Tests

**File:** `validate-schemas.test.js`

Validates all example YAML configuration files against Zod schemas to ensure they conform to the expected structure.

**Run:**
```bash
npm test
```

Or directly:
```bash
node tests/validate-schemas.test.js
```

**Validates:**
- Service YAML files (`config/examples/services/**/*.yaml`)
- Global settings (`config/examples/global-settings.yaml`)
- App configuration (`config/examples/app.config.yaml`)
- Team presets (`config/examples/team-presets.yaml`)

**Expected Output:**
```
🧪 Testing Zod Schema Validation
============================================================

📦 Testing Service YAML Files:
------------------------------------------------------------
✅ services/backend/api-service.yaml
✅ services/frontend/web-app.yaml
✅ services/infrastructure/database.yaml
✅ services/microservices/payment-service.yaml

⚙️  Testing Global Settings:
------------------------------------------------------------
✅ global-settings.yaml

🔧 Testing App Configuration:
------------------------------------------------------------
✅ app.config.yaml

👥 Testing Team Presets:
------------------------------------------------------------
✅ team-presets.yaml

============================================================
📊 Test Summary:
   ✅ Passed: 7
   ❌ Failed: 0
   📝 Total:  7
============================================================
```

---

### 2. Electron Backend Compilation Tests

**File:** `validate-electron-compilation.test.js`

Validates TypeScript compilation and JavaScript module syntax for the Electron backend.

**Run:**
```bash
npm run test:electron
```

Or directly:
```bash
node tests/validate-electron-compilation.test.js
```

**Validates:**
- TypeScript compilation (`npx tsc --noEmit`)
- Drizzle schema files exist (`electron/database/schema/*.js`)
- Database repository files exist
- Electron main.js syntax
- Database index.js syntax
- Drizzle ORM dependencies installed
- Drizzle config exists
- Schemas are JavaScript (not TypeScript)

**Expected Output:**
```
Electron Backend Compilation Tests

  ✓ TypeScript compilation
  ✓ Drizzle schema files exist
  ✓ Database repositories exist
  ✓ Electron main.js syntax valid
  ✓ Database index.js syntax valid
  ✓ Drizzle ORM dependencies installed
  ✓ Drizzle config exists
  ✓ Schemas are JavaScript (not TypeScript)

──────────────────────────────────────────────────
Total Tests: 8
Passed: 8
Failed: 0
──────────────────────────────────────────────────

✅ All Electron compilation tests passed!
```

---

### 3. Electron App Startup Test

**File:** `validate-electron-startup.test.js`

Validates that the Electron app can start successfully in development mode by actually launching it.

**Run:**
```bash
npm run test:electron:startup
```

Or directly:
```bash
node tests/validate-electron-startup.test.js
```

**What it does:**
1. Starts Vite dev server on port 5173
2. Waits for Vite to be ready
3. Starts Electron app
4. Monitors output for success indicators
5. Shuts down gracefully

**Success indicators:**
- "Database initialized successfully"
- "Electron app is ready"
- App starts without errors

**Timeout:** 30 seconds

**Expected Output:**
```
Electron App Startup Test

Starting Electron app in development mode...

Step 1: Starting Vite dev server...
  ✓ Vite dev server started on port 5173

Step 2: Starting Electron app...
  ✓ Electron app started successfully

──────────────────────────────────────────────────
Status: SUCCESS
──────────────────────────────────────────────────

✅ Electron app startup test passed!
```

**Note:** This test actually launches the Electron app, so make sure:
- Port 5173 is available (run `npm run clean-ports` if needed)
- No other Electron instances are running
- This is a slower test (~10-20 seconds) compared to compilation tests

---

### Run All Tests

To run both schema validation and Electron compilation tests:

```bash
npm run test:all
```

**Note:** The startup test (`test:electron:startup`) is separate and not included in `test:all` due to its longer runtime and requirement for ports to be available.

---

## Drizzle Schemas are JavaScript

The Electron backend uses **JavaScript** for Drizzle ORM schemas for simplicity and consistency with the rest of the Electron codebase.

### Benefits

- ✅ **No build step needed** - schemas are plain JavaScript
- ✅ **No additional dependencies** - works with Node.js directly
- ✅ **Consistency** - entire Electron backend is JavaScript
- ✅ **Simple and straightforward** - no TypeScript complexity in backend

### Schema Location

All Drizzle schemas are in `electron/database/schema/`:
```
electron/database/schema/
├── app.js                    # App-related tables
├── service-orchestration.js  # Service orchestration tables
├── git.js                    # Git provider tables
├── meta.js                   # Schema versioning
└── index.js                  # Central export
```

### Example Schema

```javascript
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const appSettings = sqliteTable('app_settings', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  key: text('key').notNull().unique(),
  value: text('value').notNull(),
});
```

## Adding New Tests

When adding new test files:

1. Create a new `.test.js` file in this directory
2. Import necessary schemas from `../electron/schemas/`
3. Add a new npm script in `package.json` if needed
4. Update this README with documentation

## Schema Locations

All Zod schemas are located in `electron/schemas/`:
- **Config schemas:** `electron/schemas/config/`
- **Database schemas:** `electron/schemas/database/`
- **IPC schemas:** `electron/schemas/ipc/`

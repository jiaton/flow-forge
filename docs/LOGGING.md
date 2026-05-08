# Logging Guide

FlowForge uses centralized logging utilities to manage log output across the application.

## Benefits

✅ **Environment-aware** - Debug logs only in development
✅ **Structured** - Consistent format with timestamps
✅ **Namespaced** - Easy to filter logs by module
✅ **File logging** - Electron logs automatically saved to files
✅ **Performance** - Logs can be disabled in production

## Frontend (React/TypeScript)

### Import the logger

```typescript
import { logger } from '@/lib/logger';

// Or create a namespaced logger for your component/module
const log = logger.namespace('MyComponent');
```

### Usage

```typescript
// Basic logging
logger.info('User logged in');
logger.debug('Debug information');
logger.warn('Something might be wrong');
logger.error('An error occurred', error);

// With context (structured data)
logger.info('Service started', { serviceName: 'api-gateway', port: 3000 });

// Namespaced logging
const log = logger.namespace('ServiceOrchestrator');
log.info('Starting service', { name: 'backend-api' });
log.error('Failed to start service', error, { name: 'backend-api' });
```

### Migration Examples

**Before:**
```typescript
console.log('[MainContent] Rendering with currentView:', currentView);
console.log('[MainContent] Registry has modules:', moduleRegistry.getAllModules());
```

**After:**
```typescript
const log = logger.namespace('MainContent');
log.debug('Rendering', { currentView });
log.debug('Registry loaded', { moduleCount: moduleRegistry.getAllModules().length });
```

## Backend (Electron/Node.js)

### Import the logger

```javascript
import { createLogger } from './utils/logger.js';

// Create namespaced logger
const log = createLogger('DatabaseService');
```

### Usage

```javascript
// Basic logging
log.info('Database initialized');
log.debug('Query executed', queryDetails);
log.warn('Slow query detected');
log.error('Database connection failed', error);

// Auto-writes to file: userData/logs/main.log
```

### Migration Examples

**Before:**
```javascript
console.log('[DB-MIGRATION] Migrated 5 services');
console.error('Failed to initialize database:', error);
```

**After:**
```javascript
import { createLogger } from './utils/logger.js';
const log = createLogger('DB-Migration');

log.info('Migrated services', { count: 5 });
log.error('Failed to initialize database', error);
```

## Log Levels

| Level | When to Use | Dev | Prod |
|-------|-------------|-----|------|
| `debug` | Detailed debugging info, verbose | ✅ | ❌ |
| `info` | General informational messages | ✅ | ✅ |
| `warn` | Warning messages, potential issues | ✅ | ✅ |
| `error` | Error messages, exceptions | ✅ | ✅ |

## Best Practices

### ✅ DO

```typescript
// Use namespaced loggers
const log = logger.namespace('GitManager');
log.info('Fetching MRs', { projectId: 123 });

// Include context in structured format
logger.info('Service started', { service: 'backend-api', port: 8080 });

// Use appropriate log levels
log.debug('Cache hit');  // Development only
log.info('User action completed');  // Important events
log.error('Operation failed', error);  // Errors with stack traces
```

### ❌ DON'T

```typescript
// Don't use console.log directly
console.log('Something happened');

// Don't log sensitive data
logger.info('User login', { password: 'secret123' }); // BAD!

// Don't use string concatenation
logger.info('User ' + username + ' logged in'); // Use context instead
```

## Viewing Logs

### Development
- **Frontend**: Check browser DevTools console
- **Backend**: Check terminal where Electron is running

### Production
- **Backend logs**: `~/Library/Application Support/FlowForge/logs/main.log` (macOS)
- Open logs folder: Menu → View → Open Logs Folder (add this menu item)

## Migration Checklist

To migrate existing console.log statements:

1. **Find all console.log**
   ```bash
   grep -r "console\." src/ electron/ --exclude-dir=node_modules
   ```

2. **Replace with logger**
   - Import logger at top of file
   - Create namespaced logger if needed
   - Replace console.log → logger.debug/info
   - Replace console.error → logger.error
   - Replace console.warn → logger.warn

3. **Add context where useful**
   - Instead of: `logger.info('Count: ' + count)`
   - Use: `logger.info('Processing items', { count })`

## Example: Migrating a Component

**Before:**
```typescript
const ServiceOrchestrator: React.FC = () => {
  console.log('[ServiceOrchestrator] Component mounted');

  const handleStart = (service: string) => {
    console.log('[ServiceOrchestrator] Starting service:', service);
    // ... logic
    console.error('[ServiceOrchestrator] Failed to start:', error);
  };
};
```

**After:**
```typescript
import { logger } from '@/lib/logger';

const log = logger.namespace('ServiceOrchestrator');

const ServiceOrchestrator: React.FC = () => {
  log.debug('Component mounted');

  const handleStart = (service: string) => {
    log.info('Starting service', { service });
    // ... logic
    log.error('Failed to start service', error, { service });
  };
};
```

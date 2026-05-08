/**
 * Zustand middleware for syncing store state with SQLite database
 * Automatically persists state changes to the database via Electron IPC
 */

import type { StateCreator, StoreMutatorIdentifier } from 'zustand';

export interface DatabasePersistOptions<T = unknown> {
  /**
   * Name of the store (used for database key)
   */
  name: string;

  /**
   * Keys to persist in database
   * If not specified, all keys will be persisted
   */
  partialize?: (state: T) => Partial<T>;

  /**
   * Called when state is loaded from database
   */
  onRehydrateStorage?: (state: T | undefined) => void | ((state?: T, error?: Error) => void);

  /**
   * Debounce delay in milliseconds for database writes
   * Default: 300ms
   */
  debounce?: number;
}

type DatabasePersist = <
  T,
  Mps extends [StoreMutatorIdentifier, unknown][] = [],
  Mcs extends [StoreMutatorIdentifier, unknown][] = []
>(
  initializer: StateCreator<T, Mps, Mcs>,
  options: DatabasePersistOptions<T>
) => StateCreator<T, Mps, Mcs>;

/**
 * Check if running in Electron environment
 */
const isElectron = () => {
  return typeof window !== 'undefined' && window.electronAPI && window.electronAPI.db;
};

/**
 * Database persistence middleware for Zustand
 */
export const databasePersist: DatabasePersist = (config, options) => (set, get, api) => {
  const { name, partialize, onRehydrateStorage, debounce = 300 } = options;

  let timeoutId: NodeJS.Timeout | null = null;

  // Load initial state from database
  const loadState = async () => {
    if (!isElectron()) {
      console.warn('Database middleware: Not in Electron environment');
      return;
    }

    try {
      const dbState = await window.electronAPI.db.appSettings.getAll();

      if (dbState && Object.keys(dbState).length > 0) {
        // Merge database state with current state
        const currentState = get();
        const mergedState = { ...currentState, ...dbState };

        // Apply the state
        set(mergedState, true);

        // Call rehydration callback if provided
        const onRehydrate = onRehydrateStorage?.(mergedState);
        onRehydrate?.(mergedState);

        console.log(`[DB Middleware] State loaded for store: ${name}`, dbState);
      }
    } catch (error) {
      console.error(`[DB Middleware] Failed to load state for ${name}:`, error);
      const onRehydrate = onRehydrateStorage?.(undefined);
      onRehydrate?.(undefined, error as Error);
    }
  };

  // Save state to database with debouncing
  const saveState = (state: T) => {
    if (!isElectron()) return;

    // Clear previous timeout
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    // Debounce the database write
    timeoutId = setTimeout(async () => {
      try {
        const stateToSave = partialize ? partialize(state) : state;

        // Save each key-value pair to the database
        await window.electronAPI.db.appSettings.setMany(stateToSave);

        console.log(`[DB Middleware] State saved for store: ${name}`);
      } catch (error) {
        console.error(`[DB Middleware] Failed to save state for ${name}:`, error);
      }
    }, debounce);
  };

  // Load initial state
  loadState();

  // Wrap the setState function to persist changes
  const wrappedSet: typeof set = (partial, replace) => {
    const nextState = typeof partial === 'function'
      ? (partial as (state: T) => T)(get())
      : partial;

    // Call original set
    set(nextState, replace);

    // Save to database after state update
    saveState(get());
  };

  // Initialize the store with wrapped set
  const storeState = config(wrappedSet, get, api);

  return storeState;
};

/**
 * Helper function to create a database-persisted store
 */
export const createPersistedStore = <T>(
  storeCreator: StateCreator<T>,
  options: DatabasePersistOptions
) => {
  return databasePersist(storeCreator, options);
};

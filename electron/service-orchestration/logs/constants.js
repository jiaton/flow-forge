// Centralized logging constants and defaults
export const MAX_LOG_ENTRIES = 2000; // per service
export const MAX_LOG_BYTES = 2 * 1024 * 1024; // ~2 MiB per service
export const MAX_LINE_LENGTH = 8192; // 8 KiB per line
export const RATE_LIMIT_LINES_PER_SEC = 200; // suppress bursts beyond this


// Helper to estimate bytes for a log entry
export function estimateEntryBytes(entry) {
  const base = 64; // rough overhead
  const msg = entry?.message ? entry.message.length : 0;
  const details = entry?.details ? JSON.stringify(entry.details).length : 0;
  return base + msg + details;
}

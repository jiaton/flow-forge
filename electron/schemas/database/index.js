/**
 * Database Validation Schemas — auto-generated from Drizzle table definitions via drizzle-zod.
 * Single source of truth: Drizzle schema → Zod validation.
 *
 * Usage:
 *   import { insertAppSetting, validate } from '../schemas/database/index.js';
 *   const result = validate(insertAppSetting, data);
 */

import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';

// Drizzle table definitions
import {
  appSettings,
  teamConfigs,
  viewStates,
  notifications,
} from '../../database/schema/app.js';
import {
  serviceState,
  detachedServices,
} from '../../database/schema/service-orchestration.js';
import {
  gitSettings,
  mergeRequests,
} from '../../database/schema/git.js';
import {
  routineSchedules,
} from '../../database/schema/routines.js';

// ============================================================================
// AUTO-GENERATED INSERT SCHEMAS (for save/create operations)
// ============================================================================

export const insertAppSetting = createInsertSchema(appSettings);
export const insertTeamConfig = createInsertSchema(teamConfigs);
export const insertViewState = createInsertSchema(viewStates);
export const insertNotification = createInsertSchema(notifications);
export const insertServiceState = createInsertSchema(serviceState);
export const insertDetachedService = createInsertSchema(detachedServices);
export const insertGitSettings = createInsertSchema(gitSettings);
export const insertMergeRequest = createInsertSchema(mergeRequests);
export const insertRoutineSchedule = createInsertSchema(routineSchedules);

// ============================================================================
// AUTO-GENERATED SELECT SCHEMAS (for reading/querying)
// ============================================================================

export const selectAppSetting = createSelectSchema(appSettings);
export const selectTeamConfig = createSelectSchema(teamConfigs);
export const selectViewState = createSelectSchema(viewStates);
export const selectNotification = createSelectSchema(notifications);
export const selectServiceState = createSelectSchema(serviceState);
export const selectDetachedService = createSelectSchema(detachedServices);
export const selectGitSettings = createSelectSchema(gitSettings);
export const selectMergeRequest = createSelectSchema(mergeRequests);
export const selectRoutineSchedule = createSelectSchema(routineSchedules);

// ============================================================================
// SUPPLEMENTARY SCHEMAS (not derived from tables)
// ============================================================================

export const NotificationQueryOptionsSchema = z.object({
  dismissed: z.boolean().optional(),
  limit: z.number().int().positive().optional().default(100),
});

export const UpdateLocalDataSchema = z.object({
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
  serviceName: z.string().optional(),
});

// ============================================================================
// GENERIC VALIDATE HELPER
// ============================================================================

/**
 * Validate data against a Zod schema.
 * Returns { success, data, error?, issues? }
 */
export function validate(schema, data) {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  const rawIssues = result.error?.issues ?? result.error?.errors ?? [];
  const issues = rawIssues.map(err => ({
    path: err.path.join('.'),
    message: err.message,
  }));
  return { success: false, error: 'Validation failed', issues };
}

// ============================================================================
// BACKWARD-COMPATIBLE NAMED VALIDATORS
// ============================================================================

export const validateAppSetting = (key, value) =>
  validate(z.object({ key: z.string().min(1), value: z.any() }), { key, value });

export const validateAppSettings = (settings) =>
  validate(z.record(z.string(), z.any()), settings);

export const validateTeamConfig = (team, config) =>
  validate(z.object({ team: z.string().min(1), config: z.any() }), { team, config });

export const validateViewState = (viewId, state) =>
  validate(z.object({ viewId: z.string().min(1), state: z.any() }), { viewId, state });

export const validateNotification = (data) =>
  validate(insertNotification, data);

export const validateServiceStateData = (data) =>
  validate(insertServiceState.partial(), data);

export const validateGitSettings = (data) =>
  validate(insertGitSettings.partial(), data);

export const validateMergeRequest = (data) =>
  validate(insertMergeRequest.partial(), data);

export const validateUpdateLocalData = (data) =>
  validate(UpdateLocalDataSchema, data);

export const validateNotificationQueryOptions = (data) =>
  validate(NotificationQueryOptionsSchema, data);

export const validateRoutineSchedule = (data) =>
  validate(insertRoutineSchedule.partial(), data);

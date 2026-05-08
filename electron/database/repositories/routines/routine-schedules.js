/**
 * Routine Schedules Repository
 */

import { eq } from 'drizzle-orm';
import { getDatabase } from '../../index.js';
import { routineSchedules } from '../../schema/routines.js';
import { createLogger } from '../../../utils/logger.js';

const logger = createLogger('RoutineSchedulesRepo');

export class RoutineSchedulesRepository {
  constructor() {
    this.db = getDatabase();
  }

  get(routineId) {
    return this.db.select().from(routineSchedules).where(eq(routineSchedules.routineId, routineId)).get() || null;
  }

  getAll() {
    return this.db.select().from(routineSchedules).all();
  }

  save(data) {
    // Normalize booleans
    const normalized = { ...data };
    if (typeof normalized.enabled === 'boolean') normalized.enabled = normalized.enabled ? 1 : 0;
    if (typeof normalized.notify === 'boolean') normalized.notify = normalized.notify ? 1 : 0;

    this.db.insert(routineSchedules)
      .values(normalized)
      .onConflictDoUpdate({
        target: routineSchedules.routineId,
        set: {
          cronExpression: normalized.cronExpression,
          enabled: normalized.enabled,
          notify: normalized.notify,
          lastRunAt: normalized.lastRunAt,
          lastRunStatus: normalized.lastRunStatus,
        },
      })
      .run();
  }

  delete(routineId) {
    this.db.delete(routineSchedules).where(eq(routineSchedules.routineId, routineId)).run();
  }
}

export const routineSchedulesRepo = new RoutineSchedulesRepository();

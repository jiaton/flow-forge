/**
 * Routine Runs Repository
 */

import { eq, desc } from 'drizzle-orm';
import { getDatabase } from '../../index.js';
import { routineRuns } from '../../schema/routines.js';

export class RoutineRunsRepository {
  constructor() {
    this.db = getDatabase();
  }

  create(data) {
    return this.db.insert(routineRuns).values(data).returning().get();
  }

  finish(id, status) {
    this.db.update(routineRuns)
      .set({ status, finishedAt: new Date().toISOString() })
      .where(eq(routineRuns.id, id))
      .run();
  }

  getByRoutine(routineId, limit = 10) {
    return this.db.select().from(routineRuns)
      .where(eq(routineRuns.routineId, routineId))
      .orderBy(desc(routineRuns.id))
      .limit(limit)
      .all();
  }

  getRecent(limit = 20) {
    return this.db.select().from(routineRuns)
      .orderBy(desc(routineRuns.id))
      .limit(limit)
      .all();
  }
}

export const routineRunsRepo = new RoutineRunsRepository();

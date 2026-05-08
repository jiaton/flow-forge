/**
 * View States Repository
 * Now using Drizzle ORM with Zod validation
 */

import { eq } from 'drizzle-orm';
import { getDatabase } from '../../index.js';
import { viewStates } from '../../schema/app.js';
import { validateViewState } from '../../../schemas/database/index.js';
import { createLogger } from '../../../utils/logger.js';

const logger = createLogger('ViewStatesRepo');

export class ViewStatesRepository {
  constructor() {
    this.db = getDatabase();
  }

  /**
   * Get view state
   */
  get(viewId) {
    const row = this.db
      .select()
      .from(viewStates)
      .where(eq(viewStates.viewId, viewId))
      .get();

    return row ? JSON.parse(row.state) : null;
  }

  /**
   * Get all view states
   */
  getAll() {
    const rows = this.db
      .select()
      .from(viewStates)
      .all();

    return rows.reduce((acc, row) => {
      acc[row.viewId] = JSON.parse(row.state);
      return acc;
    }, {});
  }

  /**
   * Save view state
   */
  save(viewId, state) {
    // Validate the view state
    const validation = validateViewState(viewId, state);
    if (!validation.success) {
      logger.error('View state validation failed:', validation.error);
      if (validation.issues) {
        validation.issues.forEach(issue => {
          logger.error(`  - ${issue.path}: ${issue.message}`);
        });
      }
      throw new Error(validation.error || 'Invalid view state');
    }

    this.db
      .insert(viewStates)
      .values({
        viewId,
        state: JSON.stringify(state),
      })
      .onConflictDoUpdate({
        target: viewStates.viewId,
        set: {
          state: JSON.stringify(state),
          updatedAt: new Date().toISOString(),
        },
      })
      .run();
  }

  /**
   * Delete view state
   */
  delete(viewId) {
    this.db
      .delete(viewStates)
      .where(eq(viewStates.viewId, viewId))
      .run();
  }
}

export const viewStatesRepo = new ViewStatesRepository();

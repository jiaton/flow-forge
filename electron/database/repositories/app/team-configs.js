/**
 * Team Configs Repository
 * Now using Drizzle ORM with Zod validation
 */

import { eq } from 'drizzle-orm';
import { getDatabase } from '../../index.js';
import { teamConfigs } from '../../schema/app.js';
import { validateTeamConfig } from '../../../schemas/database/index.js';
import { createLogger } from '../../../utils/logger.js';

const logger = createLogger('TeamConfigsRepo');

export class TeamConfigsRepository {
  constructor() {
    this.db = getDatabase();
  }

  /**
   * Get team config
   */
  get(team) {
    const row = this.db
      .select()
      .from(teamConfigs)
      .where(eq(teamConfigs.team, team))
      .get();

    return row ? JSON.parse(row.config) : null;
  }

  /**
   * Get all team configs
   */
  getAll() {
    const rows = this.db
      .select()
      .from(teamConfigs)
      .all();

    return rows.reduce((acc, row) => {
      acc[row.team] = JSON.parse(row.config);
      return acc;
    }, {});
  }

  /**
   * Save team config
   */
  save(team, config) {
    // Validate the team config
    const validation = validateTeamConfig(team, config);
    if (!validation.success) {
      logger.error('Team config validation failed:', validation.error);
      if (validation.issues) {
        validation.issues.forEach(issue => {
          logger.error(`  - ${issue.path}: ${issue.message}`);
        });
      }
      throw new Error(validation.error || 'Invalid team config');
    }

    this.db
      .insert(teamConfigs)
      .values({
        team,
        config: JSON.stringify(config),
      })
      .onConflictDoUpdate({
        target: teamConfigs.team,
        set: {
          config: JSON.stringify(config),
          updatedAt: new Date().toISOString(),
        },
      })
      .run();
  }

  /**
   * Delete team config
   */
  delete(team) {
    this.db
      .delete(teamConfigs)
      .where(eq(teamConfigs.team, team))
      .run();
  }
}

export const teamConfigsRepo = new TeamConfigsRepository();

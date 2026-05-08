/**
 * Git Settings Repository (supports GitLab, GitHub, Bitbucket, etc.)
 * Now using Drizzle ORM with Zod validation
 */

import { eq } from 'drizzle-orm';
import { getDatabase } from '../../index.js';
import { gitSettings } from '../../schema/git.js';
import { validateGitSettings } from '../../../schemas/database/index.js';
import { createLogger } from '../../../utils/logger.js';

const logger = createLogger('GitSettingsRepo');

export class GitSettingsRepository {
  constructor() {
    this.db = getDatabase();
  }

  /**
   * Get Git provider settings
   */
  get() {
    return this.db
      .select()
      .from(gitSettings)
      .where(eq(gitSettings.id, 1))
      .get();
  }

  /**
   * Save Git provider settings
   */
  save(settings) {
    // Validate git settings
    const validation = validateGitSettings(settings);
    if (!validation.success) {
      logger.error('Git settings validation failed:', validation.error);
      if (validation.issues) {
        validation.issues.forEach(issue => {
          logger.error(`  - ${issue.path}: ${issue.message}`);
        });
      }
      throw new Error(validation.error || 'Invalid git settings');
    }

    const data = validation.data;

    this.db
      .update(gitSettings)
      .set({
        provider: data.provider || 'gitlab',
        gitUrl: data.gitUrl,
        apiUrl: data.apiUrl,
        accessToken: data.accessToken,
        refreshInterval: data.refreshInterval,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(gitSettings.id, 1))
      .run();
  }
}

export const gitSettingsRepo = new GitSettingsRepository();

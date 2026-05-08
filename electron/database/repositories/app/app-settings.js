/**
 * App Settings Repository
 * Now using Drizzle ORM with Zod validation
 */

import { eq } from 'drizzle-orm';
import { getDatabase } from '../../index.js';
import { appSettings } from '../../schema/app.js';
import { validateAppSetting, validateAppSettings } from '../../../schemas/database/index.js';
import { createLogger } from '../../../utils/logger.js';

const logger = createLogger('AppSettingsRepo');

export class AppSettingsRepository {
  constructor() {
    this.db = getDatabase();
  }

  /**
   * Get a setting by key
   */
  get(key) {
    const row = this.db
      .select()
      .from(appSettings)
      .where(eq(appSettings.key, key))
      .get();

    return row ? JSON.parse(row.value) : null;
  }

  /**
   * Get all settings as an object
   */
  getAll() {
    const rows = this.db
      .select()
      .from(appSettings)
      .all();

    return rows.reduce((acc, row) => {
      acc[row.key] = JSON.parse(row.value);
      return acc;
    }, {});
  }

  /**
   * Set a setting value
   */
  set(key, value) {
    // Validate the setting
    const validation = validateAppSetting(key, value);
    if (!validation.success) {
      logger.error('App setting validation failed:', validation.error);
      if (validation.issues) {
        validation.issues.forEach(issue => {
          logger.error(`  - ${issue.path}: ${issue.message}`);
        });
      }
      throw new Error(validation.error || 'Invalid app setting');
    }

    this.db
      .insert(appSettings)
      .values({
        key,
        value: JSON.stringify(value),
      })
      .onConflictDoUpdate({
        target: appSettings.key,
        set: {
          value: JSON.stringify(value),
          updatedAt: new Date().toISOString(),
        },
      })
      .run();
  }

  /**
   * Set multiple settings at once
   */
  setMany(settings) {
    // Validate all settings
    const validation = validateAppSettings(settings);
    if (!validation.success) {
      logger.error('App settings validation failed:', validation.error);
      if (validation.issues) {
        validation.issues.forEach(issue => {
          logger.error(`  - ${issue.path}: ${issue.message}`);
        });
      }
      throw new Error(validation.error || 'Invalid app settings');
    }

    // Use transaction for atomic operation
    this.db.transaction((tx) => {
      for (const [key, value] of Object.entries(settings)) {
        tx
          .insert(appSettings)
          .values({
            key,
            value: JSON.stringify(value),
          })
          .onConflictDoUpdate({
            target: appSettings.key,
            set: {
              value: JSON.stringify(value),
              updatedAt: new Date().toISOString(),
            },
          })
          .run();
      }
    });
  }

  /**
   * Delete a setting
   */
  delete(key) {
    this.db
      .delete(appSettings)
      .where(eq(appSettings.key, key))
      .run();
  }
}

export const appSettingsRepo = new AppSettingsRepository();

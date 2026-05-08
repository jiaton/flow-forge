/**
 * Notifications Repository
 * Now using Drizzle ORM with Zod validation
 */

import { eq, desc } from 'drizzle-orm';
import { getDatabase } from '../../index.js';
import { notifications } from '../../schema/app.js';
import { validateNotification, validateNotificationQueryOptions } from '../../../schemas/database/index.js';
import { createLogger } from '../../../utils/logger.js';

const logger = createLogger('NotificationsRepo');

export class NotificationsRepository {
  constructor() {
    this.db = getDatabase();
  }

  /**
   * Get a notification by ID
   */
  get(id) {
    return this.db
      .select()
      .from(notifications)
      .where(eq(notifications.id, id))
      .get();
  }

  /**
   * Get all notifications (optionally filter by dismissed status)
   */
  getAll(options = {}) {
    // Validate query options
    const validation = validateNotificationQueryOptions(options);
    if (!validation.success) {
      logger.error('Notification query options validation failed:', validation.error);
      if (validation.issues) {
        validation.issues.forEach(issue => {
          logger.error(`  - ${issue.path}: ${issue.message}`);
        });
      }
      throw new Error(validation.error || 'Invalid query options');
    }

    const { dismissed, limit = 100 } = validation.data;

    let query = this.db
      .select()
      .from(notifications);

    if (typeof dismissed === 'boolean') {
      query = query.where(eq(notifications.dismissed, dismissed ? 1 : 0));
    }

    return query
      .orderBy(desc(notifications.timestamp))
      .limit(limit)
      .all();
  }

  /**
   * Get active (non-dismissed) notifications
   */
  getActive() {
    return this.getAll({ dismissed: false });
  }

  /**
   * Save a notification
   */
  save(notification) {
    // Convert boolean dismissed to integer for SQLite before validation
    const normalized = { ...notification };
    if (typeof normalized.dismissed === 'boolean') {
      normalized.dismissed = normalized.dismissed ? 1 : 0;
    }

    // Validate the notification
    const validation = validateNotification(normalized);
    if (!validation.success) {
      logger.error('Notification validation failed:', validation.error);
      if (validation.issues) {
        validation.issues.forEach(issue => {
          logger.error(`  - ${issue.path}: ${issue.message}`);
        });
      }
      throw new Error(validation.error || 'Invalid notification');
    }

    const data = validation.data;

    this.db
      .insert(notifications)
      .values({
        id: data.id,
        message: data.message,
        type: data.type,
        timestamp: data.timestamp ?? Date.now(),
        dismissed: data.dismissed ?? 0,
      })
      .onConflictDoUpdate({
        target: notifications.id,
        set: {
          message: data.message,
          type: data.type,
          timestamp: data.timestamp ?? Date.now(),
          dismissed: data.dismissed ?? 0,
        },
      })
      .run();
  }

  /**
   * Mark notification as dismissed
   */
  dismiss(id) {
    this.db
      .update(notifications)
      .set({ dismissed: 1 })
      .where(eq(notifications.id, id))
      .run();
  }

  /**
   * Delete old notifications
   */
  deleteOld(daysToKeep = 30) {
    const cutoffTime = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000);
    const result = this.db
      .delete(notifications)
      .where(eq(notifications.timestamp, cutoffTime))
      .run();

    return result.changes || 0;
  }
}

export const notificationsRepo = new NotificationsRepository();

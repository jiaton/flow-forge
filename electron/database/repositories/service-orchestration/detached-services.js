/**
 * Detached Services Repository
 * Tracks detached processes for recovery after app restart
 * Uses Drizzle ORM for type-safe database operations
 */

import { eq } from 'drizzle-orm';
import { getDatabase } from '../../index.js';
import { detachedServices } from '../../schema/service-orchestration.js';

export class DetachedServicesRepository {
  constructor() {
    this.db = getDatabase(); // Use Drizzle instance
  }

  /**
   * Get detached service by service ID
   */
  get(serviceId) {
    const result = this.db
      .select()
      .from(detachedServices)
      .where(eq(detachedServices.serviceId, serviceId))
      .get();
    return result;
  }

  /**
   * Get all detached services
   */
  getAll() {
    const results = this.db
      .select()
      .from(detachedServices)
      .all();
    return results;
  }

  /**
   * Save detached service PID and metadata
   */
  save(serviceId, pid, metadata) {
    this.db
      .insert(detachedServices)
      .values({
        serviceId,
        pid,
        command: metadata.command,
        workingDir: metadata.workingDir,
        logFilePath: metadata.logFilePath,
        startTime: metadata.startTime,
        lastSeen: Date.now(),
      })
      .onConflictDoUpdate({
        target: detachedServices.serviceId,
        set: {
          pid,
          command: metadata.command,
          workingDir: metadata.workingDir,
          logFilePath: metadata.logFilePath,
          startTime: metadata.startTime,
          lastSeen: Date.now(),
        },
      })
      .run();
  }

  /**
   * Delete detached service
   */
  delete(serviceId) {
    this.db
      .delete(detachedServices)
      .where(eq(detachedServices.serviceId, serviceId))
      .run();
  }

  /**
   * Delete all detached services (cleanup)
   */
  deleteAll() {
    this.db
      .delete(detachedServices)
      .run();
  }
}

export const detachedServicesRepo = new DetachedServicesRepository();

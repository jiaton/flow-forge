/**
 * Service State Repository
 * Now using Drizzle ORM with Zod validation
 */

import { eq, asc } from 'drizzle-orm';
import { getDatabase } from '../../index.js';
import { serviceState } from '../../schema/service-orchestration.js';
import { validateServiceStateData } from '../../../schemas/database/index.js';
import { createLogger } from '../../../utils/logger.js';

const logger = createLogger('ServiceStateRepo');

export class ServiceStateRepository {
  constructor() {
    this.db = getDatabase();
  }

  /**
   * Get service state by ID
   */
  get(id) {
    const row = this.db
      .select()
      .from(serviceState)
      .where(eq(serviceState.id, id))
      .get();

    return row ? this._convertRow(row) : null;
  }

  /**
   * Get all service states
   */
  getAll() {
    return this.db
      .select()
      .from(serviceState)
      .orderBy(asc(serviceState.name))
      .all()
      .map(row => this._convertRow(row));
  }

  /**
   * Get services by team
   */
  getByTeam(team) {
    return this.db
      .select()
      .from(serviceState)
      .where(eq(serviceState.team, team))
      .orderBy(asc(serviceState.name))
      .all()
      .map(row => this._convertRow(row));
  }

  /**
   * Convert database row (integers) to JavaScript types (booleans)
   */
  _convertRow(row) {
    return {
      ...row,
      detached: Boolean(row.detached),  // Convert 1/0 to true/false
    };
  }

  /**
   * Save service state
   */
  save(id, serviceData) {
    // Normalize boolean→integer for SQLite integer columns
    const normalized = { ...serviceData };
    if (typeof normalized.detached === 'boolean') normalized.detached = normalized.detached ? 1 : 0;

    // Validate service data
    const validation = validateServiceStateData(normalized);
    if (!validation.success) {
      logger.error('Service state validation failed:', validation.error);
      if (validation.issues) {
        validation.issues.forEach(issue => {
          logger.error(`  - ${issue.path}: ${issue.message}`);
        });
      }
      throw new Error(validation.error || 'Invalid service state data');
    }

    const validatedData = validation.data;

    const values = {
      id,
      name: validatedData.name,
      type: validatedData.type,
      port: validatedData.port,
      endpoint: validatedData.endpoint,
      team: validatedData.team,
      command: validatedData.command,
      processType: validatedData.processType,
      state: validatedData.state,
      workingDir: validatedData.workingDir,
      startTime: validatedData.startTime,
    };

    const updateSet = { ...values, updatedAt: new Date().toISOString() };
    delete updateSet.id;

    this.db
      .insert(serviceState)
      .values(values)
      .onConflictDoUpdate({
        target: serviceState.id,
        set: updateSet,
      })
      .run();
  }

  /**
   * Save all service states from JSON
   */
  saveAll(servicesObject) {
    this.db.transaction((tx) => {
      for (const [id, serviceData] of Object.entries(servicesObject)) {
        this.save(id, serviceData);
      }
    });
  }

  /**
   * Update service state
   */
  updateState(id, state) {
    this.db
      .update(serviceState)
      .set({
        state,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(serviceState.id, id))
      .run();
  }

  /**
   * Delete service
   */
  delete(id) {
    this.db
      .delete(serviceState)
      .where(eq(serviceState.id, id))
      .run();
  }

  /**
   * Get all services as object (matching .service-state.json format)
   */
  getAllAsObject() {
    const services = this.getAll();
    return services.reduce((acc, service) => {
      acc[service.id] = {
        name: service.name,
        type: service.type,
        port: service.port,
        endpoint: service.endpoint,
        team: service.team,
        command: service.command,
        processType: service.processType,
        state: service.state,
        workingDir: service.workingDir,
        detached: service.detached,
        startTime: service.startTime,
      };
      return acc;
    }, {});
  }
}

export const serviceStateRepo = new ServiceStateRepository();

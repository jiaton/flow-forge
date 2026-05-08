/**
 * Merge Requests Repository (supports MRs/PRs from any git provider)
 * Now using Drizzle ORM with Zod validation
 */

import { eq, desc } from 'drizzle-orm';
import { getDatabase } from '../../index.js';
import { mergeRequests } from '../../schema/git.js';
import { validateMergeRequest, validateUpdateLocalData } from '../../../schemas/database/index.js';
import { createLogger } from '../../../utils/logger.js';

const logger = createLogger('MergeRequestsRepo');

export class MergeRequestsRepository {
  constructor() {
    this.db = getDatabase();
  }

  /**
   * Get all merge requests
   */
  getAll() {
    return this.db
      .select()
      .from(mergeRequests)
      .orderBy(desc(mergeRequests.updatedAt))
      .all()
      .map(this._parseRow);
  }

  /**
   * Get merge request by ID
   */
  get(id) {
    const row = this.db
      .select()
      .from(mergeRequests)
      .where(eq(mergeRequests.id, id))
      .get();

    return row ? this._parseRow(row) : null;
  }

  /**
   * Get merge requests by status
   */
  getByStatus(status) {
    return this.db
      .select()
      .from(mergeRequests)
      .where(eq(mergeRequests.status, status))
      .orderBy(desc(mergeRequests.updatedAt))
      .all()
      .map(this._parseRow);
  }

  /**
   * Get merge requests by service
   */
  getByService(serviceName) {
    return this.db
      .select()
      .from(mergeRequests)
      .where(eq(mergeRequests.serviceName, serviceName))
      .orderBy(desc(mergeRequests.updatedAt))
      .all()
      .map(this._parseRow);
  }

  /**
   * Save or update merge request
   */
  save(mrData) {
    // Validate merge request
    const validation = validateMergeRequest(mrData);
    if (!validation.success) {
      logger.error('Merge request validation failed:', validation.error);
      if (validation.issues) {
        validation.issues.forEach(issue => {
          logger.error(`  - ${issue.path}: ${issue.message}`);
        });
      }
      throw new Error(validation.error || 'Invalid merge request data');
    }

    const data = validation.data;

    const values = {
      gitUrl: data.gitUrl,
      projectId: data.projectId,
      mrIid: data.mrIid,
      title: data.title,
      description: data.description || null,
      sourceBranch: data.sourceBranch,
      targetBranch: data.targetBranch,
      status: data.status,
      author: data.author,
      assignee: data.assignee || null,
      reviewers: typeof data.reviewers === 'string' ? data.reviewers : (data.reviewers ? JSON.stringify(data.reviewers) : null),
      pipelineStatus: data.pipelineStatus || 'pending',
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      mergedAt: data.mergedAt || null,
      approvalsCount: data.approvalsCount || 0,
      requiredApprovals: data.requiredApprovals || 0,
      commentsCount: data.commentsCount || 0,
      changesCount: data.changesCount || 0,
      webUrl: data.webUrl,
      serviceName: data.serviceName || null,
      localNotes: data.localNotes || null,
      customTags: typeof data.customTags === 'string' ? data.customTags : (data.customTags ? JSON.stringify(data.customTags) : null),
      metadata: typeof data.metadata === 'string' ? data.metadata : (data.metadata ? JSON.stringify(data.metadata) : null),
      lastFetched: new Date().toISOString(),
    };

    const { gitUrl, projectId, mrIid, ...updateSet } = values;

    const result = this.db
      .insert(mergeRequests)
      .values(values)
      .onConflictDoUpdate({
        target: [mergeRequests.gitUrl, mergeRequests.projectId, mergeRequests.mrIid],
        set: updateSet,
      })
      .run();

    return result.lastInsertRowid || result.changes;
  }

  /**
   * Update local data (notes, tags, service)
   */
  updateLocalData(id, localData) {
    // Validate local data
    const validation = validateUpdateLocalData(localData);
    if (!validation.success) {
      logger.error('Update local data validation failed:', validation.error);
      if (validation.issues) {
        validation.issues.forEach(issue => {
          logger.error(`  - ${issue.path}: ${issue.message}`);
        });
      }
      throw new Error(validation.error || 'Invalid local data');
    }

    const data = validation.data;
    const updates = {};

    if (data.notes !== undefined) {
      updates.localNotes = data.notes;
    }
    if (data.tags !== undefined) {
      updates.customTags = data.tags ? JSON.stringify(data.tags) : null;
    }
    if (data.serviceName !== undefined) {
      updates.serviceName = data.serviceName;
    }

    if (Object.keys(updates).length === 0) return;

    this.db
      .update(mergeRequests)
      .set(updates)
      .where(eq(mergeRequests.id, id))
      .run();
  }

  /**
   * Delete merge request
   */
  delete(id) {
    const result = this.db
      .delete(mergeRequests)
      .where(eq(mergeRequests.id, id))
      .run();

    return result.changes > 0;
  }

  /**
   * Parse database row to JavaScript object
   */
  _parseRow(row) {
    return {
      ...row,
      reviewers: row.reviewers ? JSON.parse(row.reviewers) : [],
      customTags: row.customTags ? JSON.parse(row.customTags) : [],
      metadata: row.metadata ? JSON.parse(row.metadata) : null,
    };
  }
}

export const mergeRequestsRepo = new MergeRequestsRepository();

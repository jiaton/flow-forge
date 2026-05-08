/**
 * Git Provider Drizzle schemas
 * Tables: git_settings, merge_requests
 */

import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// Git provider settings table - stores Git hosting configuration
export const gitSettings = sqliteTable('git_settings', {
  id: integer('id').primaryKey(), // Singleton table (id always 1)
  provider: text('provider').default('gitlab'),
  gitUrl: text('git_url').notNull().default('https://gitlab.example.com'),
  apiUrl: text('api_url').notNull().default('https://gitlab.example.com/api/v4'),
  accessToken: text('access_token'),
  refreshInterval: integer('refresh_interval').default(300),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

// Merge requests table - stores tracked MRs/PRs
export const mergeRequests = sqliteTable('merge_requests', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  gitUrl: text('git_url').notNull(),
  projectId: text('project_id').notNull(),
  mrIid: text('mr_iid').notNull(),
  title: text('title'),
  description: text('description'),
  sourceBranch: text('source_branch'),
  targetBranch: text('target_branch'),
  status: text('status'),
  author: text('author'),
  assignee: text('assignee'),
  reviewers: text('reviewers'),
  pipelineStatus: text('pipeline_status'),
  createdAt: text('created_at'),
  updatedAt: text('updated_at'),
  mergedAt: text('merged_at'),
  approvalsCount: integer('approvals_count').default(0),
  requiredApprovals: integer('required_approvals').default(0),
  commentsCount: integer('comments_count').default(0),
  changesCount: integer('changes_count'),
  webUrl: text('web_url'),
  serviceName: text('service_name'),
  localNotes: text('local_notes'),
  customTags: text('custom_tags'),
  metadata: text('metadata'),
  trackedSince: text('tracked_since').default(sql`CURRENT_TIMESTAMP`),
  lastFetched: text('last_fetched'),
}, (table) => ({
  statusIdx: index('idx_merge_requests_status').on(table.status),
  projectIdx: index('idx_merge_requests_project').on(table.projectId),
  serviceIdx: index('idx_merge_requests_service').on(table.serviceName),
  // Unique constraint on git_url, project_id, mr_iid
  uniqueConstraint: index('unique_merge_request').on(table.gitUrl, table.projectId, table.mrIid),
}));

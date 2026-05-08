/**
 * Database Schema Constants
 *
 * Constants for database table names, field names, and schema versioning.
 *
 * @module database.constants
 */

// Schema Version
export const SCHEMA_VERSION = 1;

// Table Names
export const DB_TABLES = {
  APP_SETTINGS: 'app_settings',
  TEAM_CONFIGS: 'team_configs',
  VIEW_STATES: 'view_states',
  NOTIFICATIONS: 'notifications',
  SERVICE_STATE: 'service_state',
  GIT_SETTINGS: 'git_settings',  // Generic (was gitlab_settings)
  MERGE_REQUESTS: 'merge_requests',
  SCHEMA_INFO: 'schema_info',
} as const;

// App Settings Keys
export const APP_SETTINGS_KEYS = {
  SIDEBAR_COLLAPSED: 'sidebarCollapsed',
  SELECTED_TEAM: 'selectedTeam',
  CURRENT_ENVIRONMENT: 'currentEnvironment',
  CURRENT_VIEW: 'currentView',
  THEME_MODE: 'themeMode',
  MODULE_ORDER: 'moduleOrder',
} as const;

// Service State Fields
export const SERVICE_STATE_FIELDS = {
  ID: 'id',
  NAME: 'name',
  TYPE: 'type',
  PORT: 'port',
  ENDPOINT: 'endpoint',
  TEAM: 'team',
  COMMAND: 'command',
  PROCESS_TYPE: 'process_type',
  STATE: 'state',
  WORKING_DIR: 'working_dir',
  START_TIME: 'start_time',
  UPDATED_AT: 'updated_at',
} as const;

// Merge Request Fields
export const MR_FIELDS = {
  ID: 'id',
  GIT_URL: 'gitUrl',
  PROJECT_ID: 'projectId',
  MR_IID: 'mrIid',
  TITLE: 'title',
  DESCRIPTION: 'description',
  SOURCE_BRANCH: 'sourceBranch',
  TARGET_BRANCH: 'targetBranch',
  STATUS: 'status',
  AUTHOR: 'author',
  ASSIGNEE: 'assignee',
  REVIEWERS: 'reviewers',
  PIPELINE_STATUS: 'pipelineStatus',
  CREATED_AT: 'createdAt',
  UPDATED_AT: 'updatedAt',
  MERGED_AT: 'mergedAt',
  APPROVALS_COUNT: 'approvalsCount',
  REQUIRED_APPROVALS: 'requiredApprovals',
  COMMENTS_COUNT: 'commentsCount',
  CHANGES_COUNT: 'changesCount',
  WEB_URL: 'webUrl',
  SERVICE_NAME: 'serviceName',
  LOCAL_NOTES: 'localNotes',
  CUSTOM_TAGS: 'customTags',
  METADATA: 'metadata',
  TRACKED_SINCE: 'trackedSince',
  LAST_FETCHED: 'lastFetched',
} as const;

// Git Settings Fields
export const GIT_SETTINGS_FIELDS = {
  ID: 'id',
  GIT_URL: 'gitUrl',
  API_URL: 'apiUrl',
  ACCESS_TOKEN: 'accessToken',
  REFRESH_INTERVAL: 'refreshInterval',
  UPDATED_AT: 'updatedAt',
} as const;

// TypeScript types
export type DBTable = typeof DB_TABLES[keyof typeof DB_TABLES];
export type AppSettingKey = typeof APP_SETTINGS_KEYS[keyof typeof APP_SETTINGS_KEYS];
export type ServiceStateField = typeof SERVICE_STATE_FIELDS[keyof typeof SERVICE_STATE_FIELDS];
export type MRField = typeof MR_FIELDS[keyof typeof MR_FIELDS];
export type GitSettingsField = typeof GIT_SETTINGS_FIELDS[keyof typeof GIT_SETTINGS_FIELDS];

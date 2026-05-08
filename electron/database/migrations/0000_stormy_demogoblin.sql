CREATE TABLE `app_settings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`key` text NOT NULL,
	`value` text NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE UNIQUE INDEX `app_settings_key_unique` ON `app_settings` (`key`);--> statement-breakpoint
CREATE INDEX `idx_app_settings_key` ON `app_settings` (`key`);--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` text PRIMARY KEY NOT NULL,
	`message` text NOT NULL,
	`type` text NOT NULL,
	`timestamp` integer NOT NULL,
	`dismissed` integer DEFAULT 0,
	`created_at` text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE INDEX `idx_notifications_timestamp` ON `notifications` (`timestamp`);--> statement-breakpoint
CREATE INDEX `idx_notifications_dismissed` ON `notifications` (`dismissed`);--> statement-breakpoint
CREATE TABLE `team_configs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`team` text NOT NULL,
	`config` text NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE UNIQUE INDEX `team_configs_team_unique` ON `team_configs` (`team`);--> statement-breakpoint
CREATE INDEX `idx_team_configs_team` ON `team_configs` (`team`);--> statement-breakpoint
CREATE TABLE `view_states` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`view_id` text NOT NULL,
	`state` text NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE UNIQUE INDEX `view_states_view_id_unique` ON `view_states` (`view_id`);--> statement-breakpoint
CREATE INDEX `idx_view_states_view_id` ON `view_states` (`view_id`);--> statement-breakpoint
CREATE TABLE `git_settings` (
	`id` integer PRIMARY KEY NOT NULL,
	`provider` text DEFAULT 'gitlab',
	`git_url` text DEFAULT 'https://gitlab.example.com' NOT NULL,
	`api_url` text DEFAULT 'https://gitlab.example.com/api/v4' NOT NULL,
	`access_token` text,
	`refresh_interval` integer DEFAULT 300,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `merge_requests` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`git_url` text NOT NULL,
	`project_id` text NOT NULL,
	`mr_iid` text NOT NULL,
	`title` text,
	`description` text,
	`source_branch` text,
	`target_branch` text,
	`status` text,
	`author` text,
	`assignee` text,
	`reviewers` text,
	`pipeline_status` text,
	`created_at` text,
	`updated_at` text,
	`merged_at` text,
	`approvals_count` integer DEFAULT 0,
	`required_approvals` integer DEFAULT 0,
	`comments_count` integer DEFAULT 0,
	`changes_count` integer,
	`web_url` text,
	`service_name` text,
	`local_notes` text,
	`custom_tags` text,
	`metadata` text,
	`tracked_since` text DEFAULT CURRENT_TIMESTAMP,
	`last_fetched` text
);
--> statement-breakpoint
CREATE INDEX `idx_merge_requests_status` ON `merge_requests` (`status`);--> statement-breakpoint
CREATE INDEX `idx_merge_requests_project` ON `merge_requests` (`project_id`);--> statement-breakpoint
CREATE INDEX `idx_merge_requests_service` ON `merge_requests` (`service_name`);--> statement-breakpoint
CREATE INDEX `unique_merge_request` ON `merge_requests` (`git_url`,`project_id`,`mr_iid`);--> statement-breakpoint
CREATE TABLE `detached_services` (
	`service_id` text PRIMARY KEY NOT NULL,
	`pid` integer NOT NULL,
	`command` text NOT NULL,
	`working_dir` text,
	`log_file_path` text,
	`start_time` integer NOT NULL,
	`last_seen` integer NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE INDEX `idx_detached_services_pid` ON `detached_services` (`pid`);--> statement-breakpoint
CREATE TABLE `schema_info` (
	`id` integer PRIMARY KEY NOT NULL,
	`version` integer NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `service_state` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`type` text,
	`port` integer,
	`endpoint` text,
	`team` text,
	`command` text,
	`process_type` text,
	`state` text,
	`working_dir` text,
	`detached` integer DEFAULT 1,
	`start_time` text,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE INDEX `idx_service_state_team` ON `service_state` (`team`);--> statement-breakpoint
CREATE INDEX `idx_service_state_state` ON `service_state` (`state`);
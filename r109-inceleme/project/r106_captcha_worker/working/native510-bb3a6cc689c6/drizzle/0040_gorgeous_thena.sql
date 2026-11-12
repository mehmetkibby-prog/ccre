CREATE TABLE `account_security_state` (
	`account_id` text PRIMARY KEY NOT NULL,
	`player_id` text DEFAULT '' NOT NULL,
	`score` integer DEFAULT 0 NOT NULL,
	`score_updated_at_ms` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'clear' NOT NULL,
	`temp_ban_count` integer DEFAULT 0 NOT NULL,
	`last_event_at_ms` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_account_security_status` ON `account_security_state` (`status`,`score`);--> statement-breakpoint
CREATE TABLE `admin_audit_events` (
	`id` text PRIMARY KEY NOT NULL,
	`admin_account_id` text NOT NULL,
	`action` text NOT NULL,
	`target_account_id` text DEFAULT '' NOT NULL,
	`detail_json` text DEFAULT '{}' NOT NULL,
	`created_at_ms` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_admin_audit_created` ON `admin_audit_events` (`created_at_ms`);--> statement-breakpoint
CREATE TABLE `anti_cheat_event_buckets` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`subject_key` text NOT NULL,
	`account_id` text NOT NULL,
	`player_id` text DEFAULT '' NOT NULL,
	`code` text NOT NULL,
	`surface` text NOT NULL,
	`action_name` text DEFAULT '' NOT NULL,
	`confidence` integer DEFAULT 0 NOT NULL,
	`score_delta` integer DEFAULT 0 NOT NULL,
	`occurrences` integer DEFAULT 1 NOT NULL,
	`evidence_json` text DEFAULT '{}' NOT NULL,
	`network_hash` text DEFAULT '' NOT NULL,
	`bucket_start_ms` integer NOT NULL,
	`first_at_ms` integer NOT NULL,
	`last_at_ms` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_anti_cheat_bucket_unique` ON `anti_cheat_event_buckets` (`subject_key`,`code`,`action_name`,`bucket_start_ms`);--> statement-breakpoint
CREATE INDEX `idx_anti_cheat_events_account_time` ON `anti_cheat_event_buckets` (`account_id`,`last_at_ms`);--> statement-breakpoint
CREATE INDEX `idx_anti_cheat_events_code_time` ON `anti_cheat_event_buckets` (`code`,`last_at_ms`);--> statement-breakpoint
CREATE TABLE `market_settlements` (
	`id` text PRIMARY KEY NOT NULL,
	`listing_id` text NOT NULL,
	`settlement_type` text NOT NULL,
	`buyer_id` text DEFAULT '' NOT NULL,
	`seller_id` text NOT NULL,
	`kind` text NOT NULL,
	`item_id` text,
	`item_name` text NOT NULL,
	`rarity` text DEFAULT 'white' NOT NULL,
	`power` integer DEFAULT 0 NOT NULL,
	`role` text,
	`enchantments` text DEFAULT '[]' NOT NULL,
	`amount` integer NOT NULL,
	`price_gems` integer NOT NULL,
	`created_at_ms` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_market_settlements_listing` ON `market_settlements` (`listing_id`);--> statement-breakpoint
CREATE INDEX `idx_market_settlements_buyer` ON `market_settlements` (`buyer_id`,`created_at_ms`);--> statement-breakpoint
CREATE INDEX `idx_market_settlements_seller` ON `market_settlements` (`seller_id`,`created_at_ms`);--> statement-breakpoint
CREATE TABLE `pve_engagements` (
	`player_id` text PRIMARY KEY NOT NULL,
	`monster_id` text NOT NULL,
	`spawn_round` integer NOT NULL,
	`next_hit_at_ms` integer NOT NULL,
	`expires_at_ms` integer NOT NULL,
	`hit_sequence` integer DEFAULT 0 NOT NULL,
	`updated_at_ms` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_pve_engagements_monster` ON `pve_engagements` (`monster_id`,`spawn_round`);--> statement-breakpoint
CREATE INDEX `idx_pve_engagements_expires` ON `pve_engagements` (`expires_at_ms`);--> statement-breakpoint
CREATE TABLE `security_sanctions` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`player_id` text DEFAULT '' NOT NULL,
	`kind` text NOT NULL,
	`reason_code` text NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`created_by` text DEFAULT 'system' NOT NULL,
	`created_at_ms` integer NOT NULL,
	`expires_at_ms` integer DEFAULT 0 NOT NULL,
	`revoked_at_ms` integer DEFAULT 0 NOT NULL,
	`revoked_by` text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_security_sanctions_account` ON `security_sanctions` (`account_id`,`created_at_ms`);--> statement-breakpoint
ALTER TABLE `accounts` ADD `security_version` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `accounts` ADD `suspended_until_ms` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `accounts` ADD `permanently_banned` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `accounts` ADD `ban_reason` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `auth_sessions` ADD `security_version` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `market_listings` ADD `request_id` text;--> statement-breakpoint
CREATE UNIQUE INDEX `idx_market_listings_seller_request` ON `market_listings` (`seller_id`,`request_id`);--> statement-breakpoint
ALTER TABLE `players` ADD `movement_checked_at_ms` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `players` ADD `movement_debt_ms` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `players` ADD `position_revision` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `players` ADD `realtime_scope_version` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `players` ADD `combat_lock_until_ms` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `players` ADD `fishing_cooldown_until_ms` integer DEFAULT 0 NOT NULL;
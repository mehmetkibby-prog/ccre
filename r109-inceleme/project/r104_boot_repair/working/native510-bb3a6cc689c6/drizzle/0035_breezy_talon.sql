CREATE TABLE `arena_announcements` (
	`match_id` text PRIMARY KEY NOT NULL,
	`mode` text NOT NULL,
	`team_name` text NOT NULL,
	`message` text NOT NULL,
	`created_at_ms` integer NOT NULL,
	`expires_at_ms` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_arena_announcements_expires` ON `arena_announcements` (`expires_at_ms`);--> statement-breakpoint
CREATE TABLE `arena_kill_claims` (
	`id` text PRIMARY KEY NOT NULL,
	`match_id` text NOT NULL,
	`killer_id` text NOT NULL,
	`victim_id` text NOT NULL,
	`victim_hp_revision` integer NOT NULL,
	`created_at_ms` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_arena_kill_claims_death` ON `arena_kill_claims` (`match_id`,`victim_id`,`victim_hp_revision`);--> statement-breakpoint
CREATE INDEX `idx_arena_kill_claims_match` ON `arena_kill_claims` (`match_id`,`created_at_ms`);--> statement-breakpoint
CREATE TABLE `arena_match_players` (
	`id` text PRIMARY KEY NOT NULL,
	`match_id` text NOT NULL,
	`player_id` text NOT NULL,
	`team` integer NOT NULL,
	`slot` integer NOT NULL,
	`kills` integer DEFAULT 0 NOT NULL,
	`deaths` integer DEFAULT 0 NOT NULL,
	`result_seen_at_ms` integer DEFAULT 0 NOT NULL,
	`joined_at_ms` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_arena_match_players_unique` ON `arena_match_players` (`match_id`,`player_id`);--> statement-breakpoint
CREATE INDEX `idx_arena_match_players_player` ON `arena_match_players` (`player_id`,`joined_at_ms`);--> statement-breakpoint
CREATE INDEX `idx_arena_match_players_team` ON `arena_match_players` (`match_id`,`team`,`slot`);--> statement-breakpoint
CREATE TABLE `arena_matches` (
	`id` text PRIMARY KEY NOT NULL,
	`world_cycle` integer NOT NULL,
	`channel` integer NOT NULL,
	`mode` text NOT NULL,
	`status` text DEFAULT 'countdown' NOT NULL,
	`team_size` integer NOT NULL,
	`kill_target` integer NOT NULL,
	`team_a_name` text NOT NULL,
	`team_b_name` text NOT NULL,
	`team_a_score` integer DEFAULT 0 NOT NULL,
	`team_b_score` integer DEFAULT 0 NOT NULL,
	`reward_gems` integer NOT NULL,
	`starts_at_ms` integer NOT NULL,
	`winner_team` integer DEFAULT 0 NOT NULL,
	`finished_at_ms` integer DEFAULT 0 NOT NULL,
	`settlement_token` text DEFAULT '' NOT NULL,
	`created_at_ms` integer NOT NULL,
	`updated_at_ms` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_arena_matches_status` ON `arena_matches` (`status`,`updated_at_ms`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_arena_matches_settlement_token` ON `arena_matches` (`settlement_token`) WHERE "arena_matches"."settlement_token" != '';--> statement-breakpoint
CREATE TABLE `arena_queue` (
	`player_id` text PRIMARY KEY NOT NULL,
	`mode` text NOT NULL,
	`team_name` text NOT NULL,
	`channel` integer NOT NULL,
	`queued_at_ms` integer NOT NULL,
	`last_seen_ms` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_arena_queue_matchmaking` ON `arena_queue` (`mode`,`channel`,`queued_at_ms`);--> statement-breakpoint
CREATE INDEX `idx_arena_queue_seen` ON `arena_queue` (`last_seen_ms`);--> statement-breakpoint
CREATE TABLE `arena_reward_claims` (
	`id` text PRIMARY KEY NOT NULL,
	`match_id` text NOT NULL,
	`player_id` text NOT NULL,
	`gems` integer NOT NULL,
	`settlement_token` text NOT NULL,
	`awarded_at_ms` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_arena_reward_claims_unique` ON `arena_reward_claims` (`match_id`,`player_id`);--> statement-breakpoint
CREATE INDEX `idx_arena_reward_claims_player` ON `arena_reward_claims` (`player_id`,`awarded_at_ms`);--> statement-breakpoint
ALTER TABLE `combat_settings` ADD `arena_1v1_reward_gems` integer DEFAULT 25 NOT NULL;--> statement-breakpoint
ALTER TABLE `combat_settings` ADD `arena_3v3_reward_gems` integer DEFAULT 50 NOT NULL;--> statement-breakpoint
ALTER TABLE `combat_settings` ADD `arena_5v5_reward_gems` integer DEFAULT 75 NOT NULL;--> statement-breakpoint
ALTER TABLE `players` ADD `arena_match_id` text DEFAULT '' NOT NULL;--> statement-breakpoint
CREATE INDEX `idx_players_arena_match_seen` ON `players` (`arena_match_id`,`last_seen`);
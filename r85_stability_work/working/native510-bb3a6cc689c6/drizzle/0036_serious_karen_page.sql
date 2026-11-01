CREATE TABLE `direct_message_dismissals` (
	`player_id` text NOT NULL,
	`peer_id` text NOT NULL,
	`dismissed_through_id` integer DEFAULT 0 NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_direct_message_dismissals_pair` ON `direct_message_dismissals` (`player_id`,`peer_id`);--> statement-breakpoint
CREATE INDEX `idx_direct_message_dismissals_updated` ON `direct_message_dismissals` (`updated_at`);--> statement-breakpoint
CREATE TABLE `pvp_reward_cooldowns` (
	`player_id` text NOT NULL,
	`reward_scope` text NOT NULL,
	`last_awarded_at_ms` integer NOT NULL,
	`claim_token` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_pvp_reward_cooldowns_scope` ON `pvp_reward_cooldowns` (`player_id`,`reward_scope`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_pvp_reward_cooldowns_claim` ON `pvp_reward_cooldowns` (`claim_token`);--> statement-breakpoint
CREATE TABLE `war_kill_claims` (
	`id` text PRIMARY KEY NOT NULL,
	`killer_id` text NOT NULL,
	`victim_id` text NOT NULL,
	`victim_hp_revision` integer NOT NULL,
	`created_at_ms` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_war_kill_claims_death` ON `war_kill_claims` (`victim_id`,`victim_hp_revision`);--> statement-breakpoint
CREATE INDEX `idx_war_kill_claims_created` ON `war_kill_claims` (`created_at_ms`);--> statement-breakpoint
ALTER TABLE `boss_defeats` ADD `xp_reward` integer DEFAULT 300 NOT NULL;--> statement-breakpoint
ALTER TABLE `combat_settings` ADD `shadow_wolf_xp_reward` integer DEFAULT 34 NOT NULL;--> statement-breakpoint
ALTER TABLE `combat_settings` ADD `rotten_guardian_xp_reward` integer DEFAULT 46 NOT NULL;--> statement-breakpoint
ALTER TABLE `combat_settings` ADD `essence_devourer_xp_reward` integer DEFAULT 58 NOT NULL;--> statement-breakpoint
ALTER TABLE `combat_settings` ADD `aggressive_variant_xp_reward` integer DEFAULT 62 NOT NULL;--> statement-breakpoint
ALTER TABLE `combat_settings` ADD `killer_variant_xp_reward` integer DEFAULT 95 NOT NULL;--> statement-breakpoint
ALTER TABLE `combat_settings` ADD `sinsi_shadow_wolf_xp_reward` integer DEFAULT 62 NOT NULL;--> statement-breakpoint
ALTER TABLE `combat_settings` ADD `sinsi_guardian_xp_reward` integer DEFAULT 62 NOT NULL;--> statement-breakpoint
ALTER TABLE `combat_settings` ADD `sinsi_devourer_xp_reward` integer DEFAULT 95 NOT NULL;--> statement-breakpoint
ALTER TABLE `combat_settings` ADD `sinsi_stone_xp_reward` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `combat_settings` ADD `boss_xp_reward` integer DEFAULT 300 NOT NULL;--> statement-breakpoint
ALTER TABLE `sinsi_defeats` ADD `xp_reward` integer DEFAULT 0 NOT NULL;

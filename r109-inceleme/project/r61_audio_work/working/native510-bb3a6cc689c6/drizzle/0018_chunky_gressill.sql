CREATE TABLE `guardian_reward_claims` (
	`period_at` integer PRIMARY KEY NOT NULL,
	`winner_id` text NOT NULL,
	`gems` integer NOT NULL,
	`claim_token` text NOT NULL,
	`awarded_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_guardian_reward_claims_token` ON `guardian_reward_claims` (`claim_token`);--> statement-breakpoint
CREATE INDEX `idx_guardian_reward_claims_awarded` ON `guardian_reward_claims` (`awarded_at`);--> statement-breakpoint
ALTER TABLE `game_settings` ADD `guardian_reward_gems` integer DEFAULT 20 NOT NULL;--> statement-breakpoint
ALTER TABLE `game_settings` ADD `guardian_reward_seconds` integer DEFAULT 3600 NOT NULL;--> statement-breakpoint
ALTER TABLE `messages` ADD `scope` text DEFAULT 'world' NOT NULL;--> statement-breakpoint
ALTER TABLE `messages` ADD `area` text;--> statement-breakpoint
ALTER TABLE `messages` ADD `channel` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
CREATE INDEX `idx_messages_region` ON `messages` (`scope`,`area`,`channel`,`created_at`);--> statement-breakpoint
ALTER TABLE `world_state` ADD `guardian_reward_at` integer DEFAULT 0 NOT NULL;
CREATE TABLE `boss_reward_claims` (
	`boss_round` integer NOT NULL,
	`player_id` text NOT NULL,
	`claim_token` text NOT NULL,
	`awarded_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_boss_reward_claims_unique` ON `boss_reward_claims` (`boss_round`,`player_id`);--> statement-breakpoint
CREATE INDEX `idx_boss_reward_claims_token` ON `boss_reward_claims` (`claim_token`);
CREATE TABLE `sinsi_defeats` (
	`monster_id` text NOT NULL,
	`spawn_round` integer NOT NULL,
	`defeated_at` integer NOT NULL,
	`x` real NOT NULL,
	`y` real NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_sinsi_defeats_unique` ON `sinsi_defeats` (`monster_id`,`spawn_round`);--> statement-breakpoint
CREATE INDEX `idx_sinsi_defeats_time` ON `sinsi_defeats` (`defeated_at`);--> statement-breakpoint
CREATE TABLE `sinsi_reward_claims` (
	`monster_id` text NOT NULL,
	`spawn_round` integer NOT NULL,
	`player_id` text NOT NULL,
	`claim_token` text NOT NULL,
	`awarded_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_sinsi_reward_claims_unique` ON `sinsi_reward_claims` (`monster_id`,`spawn_round`,`player_id`);--> statement-breakpoint
CREATE INDEX `idx_sinsi_reward_claims_token` ON `sinsi_reward_claims` (`claim_token`);
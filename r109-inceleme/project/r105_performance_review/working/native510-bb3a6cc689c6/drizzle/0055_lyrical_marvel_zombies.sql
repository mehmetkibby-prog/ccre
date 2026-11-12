CREATE TABLE `monster_xp_claims` (
	`monster_id` text NOT NULL,
	`spawn_round` integer NOT NULL,
	`player_id` text NOT NULL,
	`claim_token` text NOT NULL,
	`awarded_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `monster_xp_claims_unique` ON `monster_xp_claims` (`monster_id`,`spawn_round`,`player_id`);--> statement-breakpoint
CREATE INDEX `monster_xp_claims_token` ON `monster_xp_claims` (`claim_token`);
--> statement-breakpoint
INSERT OR IGNORE INTO monster_xp_claims SELECT monster_id,spawn_round,player_id,claim_token,awarded_at FROM normal_reward_claims;
--> statement-breakpoint
INSERT OR IGNORE INTO monster_xp_claims SELECT monster_id,spawn_round,player_id,claim_token,awarded_at FROM sinsi_reward_claims;
--> statement-breakpoint
INSERT OR IGNORE INTO monster_xp_claims SELECT 'dunya-bosu-1',boss_round,player_id,claim_token,awarded_at FROM boss_reward_claims;

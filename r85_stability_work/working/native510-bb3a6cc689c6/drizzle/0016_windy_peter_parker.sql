CREATE TABLE `normal_defeats` (
	`monster_id` text NOT NULL,
	`spawn_round` integer NOT NULL,
	`defeated_at` integer NOT NULL,
	`x` real NOT NULL,
	`y` real NOT NULL,
	`xp_reward` integer NOT NULL,
	`essence_min` integer NOT NULL,
	`essence_span` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_normal_defeats_unique` ON `normal_defeats` (`monster_id`,`spawn_round`);--> statement-breakpoint
CREATE INDEX `idx_normal_defeats_time` ON `normal_defeats` (`defeated_at`);--> statement-breakpoint
CREATE TABLE `normal_reward_claims` (
	`monster_id` text NOT NULL,
	`spawn_round` integer NOT NULL,
	`player_id` text NOT NULL,
	`claim_token` text NOT NULL,
	`awarded_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_normal_reward_claims_unique` ON `normal_reward_claims` (`monster_id`,`spawn_round`,`player_id`);--> statement-breakpoint
CREATE INDEX `idx_normal_reward_claims_token` ON `normal_reward_claims` (`claim_token`);--> statement-breakpoint
CREATE TABLE `__new_game_settings` (
	`id` integer PRIMARY KEY NOT NULL,
	`health_decay_per_second` real DEFAULT 0.003 NOT NULL,
	`donation_health_per_essence` real DEFAULT 0.02 NOT NULL,
	`boss_hp` integer DEFAULT 18000 NOT NULL,
	`boss_respawn_seconds` integer DEFAULT 600 NOT NULL,
	`boss_duration_seconds` integer DEFAULT 300 NOT NULL,
	`potion_essence_cost` integer DEFAULT 15 NOT NULL,
	`exchange_essence_cost` integer DEFAULT 100 NOT NULL,
	`exchange_gem_reward` integer DEFAULT 20 NOT NULL,
	`skill_upgrade_gem_cost` integer DEFAULT 25 NOT NULL,
	`regular_blue_chance` real DEFAULT 0.15 NOT NULL,
	`regular_orange_chance` real DEFAULT 0.01 NOT NULL,
	`boss_blue_chance` real DEFAULT 0.2 NOT NULL,
	`boss_orange_chance` real DEFAULT 0.03 NOT NULL,
	`item_sale_white` integer DEFAULT 2 NOT NULL,
	`item_sale_blue` integer DEFAULT 8 NOT NULL,
	`item_sale_orange` integer DEFAULT 30 NOT NULL,
	`new_year_mode` integer DEFAULT 1 NOT NULL,
	`halloween_mode` integer DEFAULT 0 NOT NULL,
	`fishing_rod_cost` integer DEFAULT 100 NOT NULL,
	`fish_sokan_value` integer DEFAULT 1 NOT NULL,
	`fish_levrek_value` integer DEFAULT 3 NOT NULL,
	`fish_zargana_value` integer DEFAULT 5 NOT NULL,
	`fish_sokan_weight` integer DEFAULT 55 NOT NULL,
	`fish_levrek_weight` integer DEFAULT 30 NOT NULL,
	`fish_zargana_weight` integer DEFAULT 15 NOT NULL,
	`xp_per_level` integer DEFAULT 125 NOT NULL,
	`skill_two_unlock_level` integer DEFAULT 5 NOT NULL,
	`skill_three_unlock_level` integer DEFAULT 30 NOT NULL,
	`skill_one_cooldown_ms` integer DEFAULT 650 NOT NULL,
	`skill_two_cooldown_ms` integer DEFAULT 10000 NOT NULL,
	`skill_three_cooldown_ms` integer DEFAULT 12000 NOT NULL,
	`skill_damage_scale` real DEFAULT 0.72 NOT NULL,
	`skill_one_multiplier` real DEFAULT 1 NOT NULL,
	`skill_two_multiplier` real DEFAULT 1.3 NOT NULL,
	`skill_three_multiplier` real DEFAULT 1.75 NOT NULL,
	`skill_upgrade_damage_per_level` real DEFAULT 0.04 NOT NULL,
	`boss_guaranteed_white_drops` integer DEFAULT 3 NOT NULL
);--> statement-breakpoint
INSERT INTO `__new_game_settings` (
	`id`, `health_decay_per_second`, `donation_health_per_essence`, `boss_hp`, `boss_respawn_seconds`,
	`boss_duration_seconds`, `potion_essence_cost`, `exchange_essence_cost`, `exchange_gem_reward`, `skill_upgrade_gem_cost`,
	`regular_blue_chance`, `regular_orange_chance`, `boss_blue_chance`, `boss_orange_chance`,
	`item_sale_white`, `item_sale_blue`, `item_sale_orange`, `new_year_mode`, `halloween_mode`,
	`fishing_rod_cost`, `fish_sokan_value`, `fish_levrek_value`, `fish_zargana_value`,
	`fish_sokan_weight`, `fish_levrek_weight`, `fish_zargana_weight`, `xp_per_level`,
	`skill_two_unlock_level`, `skill_three_unlock_level`, `skill_one_cooldown_ms`, `skill_two_cooldown_ms`,
	`skill_three_cooldown_ms`, `skill_damage_scale`, `skill_one_multiplier`, `skill_two_multiplier`,
	`skill_three_multiplier`, `skill_upgrade_damage_per_level`, `boss_guaranteed_white_drops`
)
SELECT
	`id`, `health_decay_per_second`, `donation_health_per_essence`, `boss_hp`, `boss_respawn_seconds`,
	`boss_duration_seconds`, `potion_essence_cost`, `exchange_essence_cost`, `exchange_gem_reward`, `skill_upgrade_gem_cost`,
	`regular_blue_chance`, `regular_orange_chance`, `boss_blue_chance`, `boss_orange_chance`,
	`item_sale_white`, `item_sale_blue`, `item_sale_orange`, `new_year_mode`, `halloween_mode`,
	`fishing_rod_cost`, `fish_sokan_value`, `fish_levrek_value`, `fish_zargana_value`,
	`fish_sokan_weight`, `fish_levrek_weight`, `fish_zargana_weight`, `xp_per_level`,
	`skill_two_unlock_level`, `skill_three_unlock_level`, `skill_one_cooldown_ms`, `skill_two_cooldown_ms`,
	`skill_three_cooldown_ms`, `skill_damage_scale`, `skill_one_multiplier`, `skill_two_multiplier`,
	`skill_three_multiplier`, `skill_upgrade_damage_per_level`, `boss_guaranteed_white_drops`
FROM `game_settings`;--> statement-breakpoint
DROP TABLE `game_settings`;--> statement-breakpoint
ALTER TABLE `__new_game_settings` RENAME TO `game_settings`;

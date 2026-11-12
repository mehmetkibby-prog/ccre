CREATE TABLE `game_settings` (
	`id` integer PRIMARY KEY NOT NULL,
	`health_decay_per_second` real DEFAULT 0.003 NOT NULL,
	`donation_health_per_essence` real DEFAULT 0.08 NOT NULL,
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
	`item_sale_orange` integer DEFAULT 30 NOT NULL
);

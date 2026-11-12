CREATE TABLE `blacksmith_upgrades` (
	`item_id` text PRIMARY KEY NOT NULL,
	`player_id` text NOT NULL,
	`claim_token` text NOT NULL,
	`prior_power` integer NOT NULL,
	`upgraded_power` integer NOT NULL,
	`upgraded_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_blacksmith_upgrades_token` ON `blacksmith_upgrades` (`claim_token`);--> statement-breakpoint
CREATE INDEX `idx_blacksmith_upgrades_player` ON `blacksmith_upgrades` (`player_id`,`upgraded_at`);--> statement-breakpoint
CREATE TABLE `economy_settings` (
	`id` integer PRIMARY KEY DEFAULT 1 NOT NULL,
	`fishing_pearl_chance` real DEFAULT 0.03 NOT NULL,
	`blacksmith_dust_cost` integer DEFAULT 250 NOT NULL,
	`blacksmith_pearl_cost` integer DEFAULT 25 NOT NULL,
	`blacksmith_gem_cost` integer DEFAULT 5000 NOT NULL,
	`unique_weapon_power` integer DEFAULT 150 NOT NULL,
	`unique_armor_power` integer DEFAULT 150 NOT NULL
);
--> statement-breakpoint
INSERT OR IGNORE INTO `economy_settings` (`id`) VALUES (1);--> statement-breakpoint
ALTER TABLE `combat_settings` ADD `enchant_one_chance` real DEFAULT 0.15 NOT NULL;--> statement-breakpoint
ALTER TABLE `combat_settings` ADD `enchant_two_chance` real DEFAULT 0.45 NOT NULL;--> statement-breakpoint
ALTER TABLE `combat_settings` ADD `enchant_four_chance` real DEFAULT 0.04 NOT NULL;--> statement-breakpoint
ALTER TABLE `combat_settings` ADD `enchant_resistant_players_weight` real DEFAULT 0.7 NOT NULL;--> statement-breakpoint
ALTER TABLE `combat_settings` ADD `enchant_critical_weight` real DEFAULT 0.8 NOT NULL;--> statement-breakpoint
ALTER TABLE `combat_settings` ADD `enchant_resistant_players_min` integer DEFAULT 4 NOT NULL;--> statement-breakpoint
ALTER TABLE `combat_settings` ADD `enchant_resistant_players_max` integer DEFAULT 12 NOT NULL;--> statement-breakpoint
ALTER TABLE `combat_settings` ADD `enchant_critical_min` integer DEFAULT 2 NOT NULL;--> statement-breakpoint
ALTER TABLE `combat_settings` ADD `enchant_critical_max` integer DEFAULT 6 NOT NULL;--> statement-breakpoint
ALTER TABLE `players` ADD `pearls` integer DEFAULT 0 NOT NULL;

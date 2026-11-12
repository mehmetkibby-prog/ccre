CREATE TABLE `combat_settings` (
	`id` integer PRIMARY KEY DEFAULT 1 NOT NULL,
	`enchant_item_chance` real DEFAULT 0.72 NOT NULL,
	`enchant_three_chance` real DEFAULT 0.36 NOT NULL,
	`enchant_fire_weight` real DEFAULT 1 NOT NULL,
	`enchant_ice_weight` real DEFAULT 1 NOT NULL,
	`enchant_sword_defense_weight` real DEFAULT 1 NOT NULL,
	`enchant_arrow_defense_weight` real DEFAULT 1 NOT NULL,
	`enchant_magic_defense_weight` real DEFAULT 1 NOT NULL,
	`enchant_strong_players_weight` real DEFAULT 0.7 NOT NULL,
	`enchant_fire_min` integer DEFAULT 5 NOT NULL,
	`enchant_fire_max` integer DEFAULT 10 NOT NULL,
	`enchant_ice_min` integer DEFAULT 5 NOT NULL,
	`enchant_ice_max` integer DEFAULT 10 NOT NULL,
	`enchant_sword_defense_min` integer DEFAULT 4 NOT NULL,
	`enchant_sword_defense_max` integer DEFAULT 12 NOT NULL,
	`enchant_arrow_defense_min` integer DEFAULT 4 NOT NULL,
	`enchant_arrow_defense_max` integer DEFAULT 12 NOT NULL,
	`enchant_magic_defense_min` integer DEFAULT 4 NOT NULL,
	`enchant_magic_defense_max` integer DEFAULT 12 NOT NULL,
	`enchant_strong_players_min` integer DEFAULT 4 NOT NULL,
	`enchant_strong_players_max` integer DEFAULT 12 NOT NULL,
	`elemental_tick_count` integer DEFAULT 4 NOT NULL,
	`elemental_tick_interval_ms` integer DEFAULT 320 NOT NULL,
	`pvp_kill_reward_gems` integer DEFAULT 3 NOT NULL,
	`pvp_death_loss_gems` integer DEFAULT 1 NOT NULL,
	`pvp_respawn_seconds` integer DEFAULT 3 NOT NULL
);
--> statement-breakpoint
INSERT OR IGNORE INTO `combat_settings` (`id`) VALUES (1);--> statement-breakpoint
ALTER TABLE `market_listings` ADD `enchantments` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `player_items` ADD `enchantments` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `world_drops` ADD `enchantments` text DEFAULT '[]' NOT NULL;

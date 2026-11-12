ALTER TABLE `game_settings` ADD `channel_capacity` integer DEFAULT 15 NOT NULL;--> statement-breakpoint
ALTER TABLE `game_settings` ADD `sinsi_stone_unlock_level` integer DEFAULT 50 NOT NULL;--> statement-breakpoint
ALTER TABLE `game_settings` ADD `sinsi_stone_hp` integer DEFAULT 12000 NOT NULL;--> statement-breakpoint
ALTER TABLE `game_settings` ADD `sinsi_stone_respawn_seconds` integer DEFAULT 180 NOT NULL;--> statement-breakpoint
ALTER TABLE `game_settings` ADD `sinsi_stone_wave_count` integer DEFAULT 3 NOT NULL;--> statement-breakpoint
ALTER TABLE `game_settings` ADD `sinsi_stone_summon_hp` integer DEFAULT 650 NOT NULL;--> statement-breakpoint
ALTER TABLE `game_settings` ADD `sinsi_stone_summon_damage_scale` real DEFAULT 0.8 NOT NULL;--> statement-breakpoint
ALTER TABLE `game_settings` ADD `sinsi_stone_essence_min` integer DEFAULT 18 NOT NULL;--> statement-breakpoint
ALTER TABLE `game_settings` ADD `sinsi_stone_essence_max` integer DEFAULT 32 NOT NULL;--> statement-breakpoint
ALTER TABLE `game_settings` ADD `sinsi_stone_gear_drops` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `game_settings` ADD `sinsi_stone_dust_reward` integer DEFAULT 3 NOT NULL;--> statement-breakpoint
ALTER TABLE `game_settings` ADD `sinsi_stone_armor_chance` real DEFAULT 0.5 NOT NULL;--> statement-breakpoint
ALTER TABLE `game_settings` ADD `sinsi_stone_blue_chance` real DEFAULT 0.32 NOT NULL;--> statement-breakpoint
ALTER TABLE `game_settings` ADD `sinsi_stone_orange_chance` real DEFAULT 0.06 NOT NULL;--> statement-breakpoint
ALTER TABLE `game_settings` ADD `sinsi_stone_red_chance` real DEFAULT 0.01 NOT NULL;--> statement-breakpoint
ALTER TABLE `monsters` ADD `area` text DEFAULT 'forest' NOT NULL;--> statement-breakpoint
ALTER TABLE `monsters` ADD `channel` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `monsters` ADD `is_stone` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `monsters` ADD `wave_stage` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `monsters` ADD `summoned` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `monsters` ADD `parent_stone_id` text;--> statement-breakpoint
CREATE INDEX `idx_monsters_area_channel` ON `monsters` (`area`,`channel`,`hp`);--> statement-breakpoint
CREATE INDEX `idx_monsters_parent_stone` ON `monsters` (`parent_stone_id`,`spawn_round`);--> statement-breakpoint
ALTER TABLE `players` ADD `stone_dust` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE INDEX `idx_players_channel_seen` ON `players` (`channel`,`last_seen`);
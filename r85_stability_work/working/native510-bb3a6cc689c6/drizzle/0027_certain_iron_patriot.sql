ALTER TABLE `game_settings` ADD `shadow_wolf_hp` integer DEFAULT 220 NOT NULL;--> statement-breakpoint
ALTER TABLE `game_settings` ADD `rotten_guardian_hp` integer DEFAULT 340 NOT NULL;--> statement-breakpoint
ALTER TABLE `game_settings` ADD `essence_devourer_hp` integer DEFAULT 480 NOT NULL;--> statement-breakpoint
ALTER TABLE `game_settings` ADD `aggressive_variant_hp_scale` real DEFAULT 1.7 NOT NULL;--> statement-breakpoint
ALTER TABLE `game_settings` ADD `killer_variant_hp_scale` real DEFAULT 2.65 NOT NULL;--> statement-breakpoint
ALTER TABLE `game_settings` ADD `xp_base_cost` integer DEFAULT 50 NOT NULL;--> statement-breakpoint
ALTER TABLE `game_settings` ADD `xp_growth_per_level` integer DEFAULT 10 NOT NULL;--> statement-breakpoint
ALTER TABLE `world_drops` ADD `collectible_at` integer DEFAULT 0 NOT NULL;
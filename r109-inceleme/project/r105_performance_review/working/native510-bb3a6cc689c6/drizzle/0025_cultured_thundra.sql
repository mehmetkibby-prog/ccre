ALTER TABLE `game_settings` ADD `starter_weapon_power` integer DEFAULT 5 NOT NULL;--> statement-breakpoint
ALTER TABLE `game_settings` ADD `guardian_base_attack` integer DEFAULT 24 NOT NULL;--> statement-breakpoint
ALTER TABLE `game_settings` ADD `hunter_base_attack` integer DEFAULT 25 NOT NULL;--> statement-breakpoint
ALTER TABLE `game_settings` ADD `arcanist_base_attack` integer DEFAULT 27 NOT NULL;--> statement-breakpoint
ALTER TABLE `game_settings` ADD `base_critical_chance` real DEFAULT 0.11 NOT NULL;--> statement-breakpoint
ALTER TABLE `game_settings` ADD `third_skill_critical_bonus` real DEFAULT 0.11 NOT NULL;--> statement-breakpoint
ALTER TABLE `game_settings` ADD `critical_damage_multiplier` real DEFAULT 1.45 NOT NULL;--> statement-breakpoint
ALTER TABLE `game_settings` ADD `wing_gem_cost` integer DEFAULT 5000 NOT NULL;--> statement-breakpoint
ALTER TABLE `game_settings` ADD `wing_attack_bonus` integer DEFAULT 30 NOT NULL;--> statement-breakpoint
ALTER TABLE `game_settings` ADD `wing_defense_bonus` integer DEFAULT 50 NOT NULL;--> statement-breakpoint
ALTER TABLE `game_settings` ADD `wing_critical_chance` real DEFAULT 0.15 NOT NULL;--> statement-breakpoint
ALTER TABLE `players` ADD `has_wings` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `players` ADD `wings_equipped` integer DEFAULT 0 NOT NULL;
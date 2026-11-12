ALTER TABLE `combat_settings` ADD `enchant_attack_speed_weight` real DEFAULT 0.8 NOT NULL;--> statement-breakpoint
ALTER TABLE `combat_settings` ADD `enchant_attack_speed_min` integer DEFAULT 4 NOT NULL;--> statement-breakpoint
ALTER TABLE `combat_settings` ADD `enchant_attack_speed_max` integer DEFAULT 12 NOT NULL;
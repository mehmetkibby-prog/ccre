ALTER TABLE `combat_settings` ADD `boss_fire_interval_seconds` integer DEFAULT 7 NOT NULL;--> statement-breakpoint
ALTER TABLE `combat_settings` ADD `boss_fire_damage_multiplier` real DEFAULT 1.2 NOT NULL;--> statement-breakpoint
ALTER TABLE `pve_engagements` ADD `last_skill_at_ms` integer DEFAULT 0 NOT NULL;
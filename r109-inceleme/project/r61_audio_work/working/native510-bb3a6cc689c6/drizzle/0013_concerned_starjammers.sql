ALTER TABLE `game_settings` ADD `xp_per_level` integer DEFAULT 125 NOT NULL;--> statement-breakpoint
ALTER TABLE `game_settings` ADD `skill_two_unlock_level` integer DEFAULT 5 NOT NULL;--> statement-breakpoint
ALTER TABLE `game_settings` ADD `skill_three_unlock_level` integer DEFAULT 30 NOT NULL;--> statement-breakpoint
ALTER TABLE `game_settings` ADD `skill_one_cooldown_ms` integer DEFAULT 650 NOT NULL;--> statement-breakpoint
ALTER TABLE `game_settings` ADD `skill_two_cooldown_ms` integer DEFAULT 10000 NOT NULL;--> statement-breakpoint
ALTER TABLE `game_settings` ADD `skill_three_cooldown_ms` integer DEFAULT 12000 NOT NULL;--> statement-breakpoint
ALTER TABLE `game_settings` ADD `skill_damage_scale` real DEFAULT 0.72 NOT NULL;--> statement-breakpoint
ALTER TABLE `game_settings` ADD `skill_one_multiplier` real DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `game_settings` ADD `skill_two_multiplier` real DEFAULT 1.3 NOT NULL;--> statement-breakpoint
ALTER TABLE `game_settings` ADD `skill_three_multiplier` real DEFAULT 1.75 NOT NULL;--> statement-breakpoint
ALTER TABLE `game_settings` ADD `skill_upgrade_damage_per_level` real DEFAULT 0.04 NOT NULL;--> statement-breakpoint
ALTER TABLE `game_settings` ADD `boss_guaranteed_white_drops` integer DEFAULT 3 NOT NULL;--> statement-breakpoint
INSERT OR IGNORE INTO `game_settings` (`id`, `donation_health_per_essence`) VALUES (1, 0.02);--> statement-breakpoint
UPDATE `game_settings` SET `donation_health_per_essence` = 0.02 WHERE `id` = 1 AND `donation_health_per_essence` > 0.02;--> statement-breakpoint
UPDATE `players` SET `xp` = MAX(`xp`, MAX(0, `level` - 1) * 125);--> statement-breakpoint
ALTER TABLE `boss_participants` ADD `total_damage` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
UPDATE `boss_participants` SET `total_damage` = 1
WHERE `hit_count` > 0 AND `total_damage` = 0
  AND EXISTS (
    SELECT 1 FROM `monsters`
    WHERE `monsters`.`is_boss` = 1
      AND `monsters`.`hp` > 0
      AND `monsters`.`spawn_round` = `boss_participants`.`boss_round`
  );--> statement-breakpoint
CREATE INDEX `idx_boss_participants_damage` ON `boss_participants` (`boss_round`,`total_damage`);--> statement-breakpoint
ALTER TABLE `players` ADD `hp_revision` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `players` ADD `respawn_at_ms` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
UPDATE `players` SET `respawn_at_ms` = CAST(strftime('%s', 'now') AS integer) * 1000 + 2600 WHERE `hp` <= 0 AND `respawn_at_ms` = 0;

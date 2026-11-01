ALTER TABLE `combat_settings` ADD `enchant_hp_weight` real DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `combat_settings` ADD `enchant_hp_tier_one` integer DEFAULT 100 NOT NULL;--> statement-breakpoint
ALTER TABLE `combat_settings` ADD `enchant_hp_tier_two` integer DEFAULT 200 NOT NULL;--> statement-breakpoint
ALTER TABLE `combat_settings` ADD `enchant_hp_tier_three` integer DEFAULT 300 NOT NULL;--> statement-breakpoint
ALTER TABLE `players` ADD `max_hp` integer DEFAULT 100 NOT NULL;--> statement-breakpoint
UPDATE `player_items` SET `equipped` = 0
WHERE `equipped` = 1 AND EXISTS (
  SELECT 1 FROM `player_items` newer
  WHERE newer.`player_id` = `player_items`.`player_id`
    AND newer.`kind` = `player_items`.`kind`
    AND newer.`equipped` = 1
    AND (newer.`created_at` > `player_items`.`created_at`
      OR (newer.`created_at` = `player_items`.`created_at` AND newer.`id` > `player_items`.`id`))
);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_player_items_equipped_slot` ON `player_items` (`player_id`,`kind`) WHERE "player_items"."equipped" = 1;

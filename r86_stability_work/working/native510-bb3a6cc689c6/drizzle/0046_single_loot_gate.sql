UPDATE game_settings SET
  boss_guaranteed_white_drops = 0,
  sinsi_stone_gear_drops = 1,
  sinsi_stone_essence_min = MAX(1, sinsi_stone_essence_min),
  sinsi_stone_essence_max = MAX(1, sinsi_stone_essence_max, sinsi_stone_essence_min)
WHERE id = 1;--> statement-breakpoint
UPDATE combat_settings SET
  frozen_boss_item_drop_count = 1,
  frozen_water_item_drop_count = 1
WHERE id = 1;--> statement-breakpoint
UPDATE loot_profiles SET
  active_revision = 0,
  updated_at = CAST(strftime('%s', 'now') AS INTEGER)
WHERE active_revision <> 0;

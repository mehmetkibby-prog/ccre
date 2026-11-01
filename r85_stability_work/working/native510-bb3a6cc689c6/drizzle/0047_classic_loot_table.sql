-- Restore the compact, single-roll loot defaults without deleting immutable
-- profile/template/defeat history. Active pointers fall back to the new V80
-- defaults while immutable revisions and defeat snapshots remain preserved.
UPDATE loot_profiles
SET active_revision = 0,
    updated_at = CAST(strftime('%s', 'now') AS INTEGER)
WHERE active_revision <> 0;
--> statement-breakpoint
-- The frozen map now opens at level 20. Relocate stale low-level sessions so
-- neither an old tab nor a reconnect can remain inside the locked area.
UPDATE players
SET area = 'bazaar',
    arena_match_id = '',
    x = 1200,
    y = 920,
    movement_checked_at_ms = CAST(strftime('%s', 'now') AS INTEGER) * 1000,
    movement_debt_ms = 0,
    position_revision = position_revision + 1,
    realtime_scope_version = realtime_scope_version + 1,
    combat_lock_until_ms = 0
WHERE area = 'frozen' AND level < 20;

ALTER TABLE `fishing_sessions` ADD `bite_at_ms` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `fishing_sessions` ADD `proof_updated_at_ms` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `fishing_sessions` ADD `proof_sequence` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `fishing_sessions` ADD `proof_bar` integer DEFAULT 580000 NOT NULL;--> statement-breakpoint
ALTER TABLE `fishing_sessions` ADD `proof_velocity` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `fishing_sessions` ADD `proof_progress` integer DEFAULT 260000 NOT NULL;--> statement-breakpoint
ALTER TABLE `fishing_sessions` ADD `proof_holding` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `fishing_sessions` ADD `proof_samples` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `fishing_sessions` ADD `proof_changes` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `players_scope_cleanup`
AFTER UPDATE OF `realtime_scope_version` ON `players`
WHEN NEW.`realtime_scope_version` <> OLD.`realtime_scope_version`
BEGIN
  DELETE FROM `pve_engagements` WHERE `player_id` = NEW.`id`;
  DELETE FROM `fishing_sessions` WHERE `player_id` = NEW.`id`;
END;

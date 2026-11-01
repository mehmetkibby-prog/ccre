UPDATE players SET has_wings = 1 WHERE EXISTS (SELECT 1 FROM black_loot_chests c WHERE c.victim_id = players.id AND c.has_wings > 0);
--> statement-breakpoint
UPDATE black_loot_chests SET has_wings = 0, take_wings = 0 WHERE has_wings > 0 OR take_wings > 0;
--> statement-breakpoint
CREATE TRIGGER preserve_owned_wings AFTER UPDATE OF has_wings ON players WHEN OLD.has_wings = 1 AND NEW.has_wings = 0 BEGIN UPDATE players SET has_wings = 1 WHERE id = NEW.id; END;

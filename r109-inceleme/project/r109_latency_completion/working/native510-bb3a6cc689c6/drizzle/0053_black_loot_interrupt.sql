-- Any accepted hit or actual movement interrupts collection, even if the player
-- returns to the same position or heals before submitting the finish request.
CREATE TRIGGER black_loot_interrupt_player
AFTER UPDATE ON players
WHEN NEW.x != OLD.x OR NEW.y != OLD.y OR NEW.hp < OLD.hp
  OR NEW.last_monster_hit_at != OLD.last_monster_hit_at
  OR NEW.area != OLD.area OR NEW.channel != OLD.channel
  OR NEW.attack_one_at != OLD.attack_one_at OR NEW.attack_two_at != OLD.attack_two_at
  OR NEW.attack_three_at != OLD.attack_three_at OR NEW.realtime_scope_version != OLD.realtime_scope_version
BEGIN
  DELETE FROM black_loot_attempts WHERE player_id = NEW.id;
END;

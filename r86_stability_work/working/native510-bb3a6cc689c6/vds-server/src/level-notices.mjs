// Same transaction as XP/level writes: no missed milestones or duplicate retries.
export function ensureLevelNotices(db){
 db.exec(`CREATE INDEX IF NOT EXISTS idx_war_kills_day ON war_kill_claims(created_at_ms,killer_id);`);
 for(const level of [50,40,30,20,10])db.exec(`CREATE TRIGGER IF NOT EXISTS level_notice_${level}
 AFTER UPDATE OF level ON players WHEN OLD.level<${level} AND NEW.level>=${level}
 BEGIN
 INSERT OR IGNORE INTO messages(player_id,player_name,recipient_id,scope,area,channel,body,created_at,announcement_expires_at_ms,announcement_request_id)
 SELECT NEW.id,'SEVİYE',NULL,'world',NULL,1,NEW.name || ' oyuncusu ${level}. Seviyeye ulaştı!',
 MAX(unixepoch(),COALESCE((SELECT MAX(announcement_expires_at_ms)/1000 FROM messages WHERE announcement_expires_at_ms>unixepoch()*1000),0)),
 (MAX(unixepoch(),COALESCE((SELECT MAX(announcement_expires_at_ms)/1000 FROM messages WHERE announcement_expires_at_ms>unixepoch()*1000),0))+7)*1000,
 'level-${level}';
 END;`);
}

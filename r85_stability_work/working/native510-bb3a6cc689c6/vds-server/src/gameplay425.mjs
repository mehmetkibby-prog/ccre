import {ensureDailyMonsterReward477} from './daily-monster-reward477.mjs';
// Additive, bounded state only. Counts reuse unique committed reward receipts.
export function ensureGameplay425Schema(db){
 db.exec('BEGIN IMMEDIATE');try{
  const columns=new Set(db.prepare('PRAGMA table_info(players)').all().map(c=>c.name));
  for(const name of ['red_pearls','daily_monster_day','daily_monster_kills'])if(!columns.has(name))db.exec(`ALTER TABLE players ADD COLUMN ${name} INTEGER NOT NULL DEFAULT 0`);
  db.exec('CREATE INDEX IF NOT EXISTS idx_daily_monster_ranking ON players(daily_monster_day,daily_monster_kills DESC,id) WHERE is_gm=0 AND daily_monster_kills>0');
  const increment=(day)=>`UPDATE players SET daily_monster_kills=CASE WHEN daily_monster_day=${day} THEN daily_monster_kills+1 ELSE 1 END,daily_monster_day=${day} WHERE id=NEW.player_id AND is_gm=0 AND daily_monster_day<=${day};`;
  db.exec(`CREATE TRIGGER IF NOT EXISTS daily_monster_normal425 AFTER INSERT ON normal_reward_claims
   WHEN EXISTS(SELECT 1 FROM monsters WHERE id=NEW.monster_id AND is_stone=0)
   BEGIN ${increment("CAST(((SELECT defeated_at FROM normal_defeats WHERE monster_id=NEW.monster_id AND spawn_round=NEW.spawn_round)+10800)/86400 AS INTEGER)")} END;
   CREATE TRIGGER IF NOT EXISTS daily_monster_boss425 AFTER INSERT ON boss_reward_claims
   BEGIN ${increment("CAST(((SELECT defeated_at FROM boss_defeats WHERE boss_round=NEW.boss_round)+10800)/86400 AS INTEGER)")} END;
   CREATE TRIGGER IF NOT EXISTS daily_monster_dungeon425 AFTER INSERT ON dungeon_rewards
   BEGIN ${increment("CAST((unixepoch()+10800)/86400 AS INTEGER)")} END;`);
  // A non-final arena score starts a fresh round for every participant.
  // Guild battles retain their existing rules. Trigger work shares the kill commit.
  db.exec(`CREATE TRIGGER IF NOT EXISTS arena_round_reset425 AFTER UPDATE OF team_a_score,team_b_score ON arena_matches
   WHEN NEW.id NOT LIKE 'guild-%' AND NEW.status!='finished' AND NEW.team_a_score+NEW.team_b_score>OLD.team_a_score+OLD.team_b_score
   BEGIN
    UPDATE arena_matches SET status='countdown',starts_at_ms=NEW.updated_at_ms+3000 WHERE id=NEW.id;
    UPDATE players SET hp=max_hp,hp_revision=hp_revision+1,respawn_at_ms=0,
     attack_one_at=0,attack_two_at=0,attack_three_at=0, attack_four_at=0, special_guard_until_ms=0,combat_lock_until_ms=0,stun_until_ms=0,root_until_ms=0,
     x=CASE (SELECT team FROM arena_match_players WHERE match_id=NEW.id AND player_id=players.id) WHEN 1 THEN 650 ELSE 1750 END,
     y=750+CASE WHEN NEW.team_size<=1 THEN 0 ELSE ((SELECT slot FROM arena_match_players WHERE match_id=NEW.id AND player_id=players.id)-(NEW.team_size-1)/2.0)*115 END,
     movement_checked_at_ms=NEW.updated_at_ms,movement_debt_ms=0,motion_stream_id='',motion_sequence=0,
     position_revision=position_revision+1,realtime_scope_version=realtime_scope_version+1
     WHERE arena_match_id=NEW.id AND area='arena';
   END;`);
  ensureArenaQueue498(db);
  ensureDailyMonsterReward477(db);
  db.exec('COMMIT');
 }catch(error){db.exec('ROLLBACK');throw error;}
}

export function createMonsterRanking(db,{now=Date.now}={}){
 let cache=null,expires=0;
 const rows=db.prepare(`SELECT p.id,p.name,p.role,p.daily_monster_kills AS kills FROM players p
  JOIN accounts a ON a.id=p.account_id WHERE p.is_gm=0 AND p.loadlab_run_id='' AND p.daily_monster_kills>0 AND p.daily_monster_day=? AND a.permanently_banned=0
  ORDER BY p.daily_monster_kills DESC,p.id LIMIT 10`);
 return {read(){const t=now(),day=Math.floor((t+10800000)/86400000);if(!cache||t>=expires||cache.day!==day){cache={day,winnerRewardCoins:50,rows:rows.all(day).map((r,i)=>({...r,rank:i+1})),updatedAt:t,resetsAt:(day+1)*86400000-10800000};expires=t+10000;}return cache;}};
}


function ensureArenaQueue498(db) {
  const columns=new Set(db.prepare('PRAGMA table_info(arena_queue)').all().map(row=>row.name));
  for(const [name,type] of [['queue_group498',"TEXT NOT NULL DEFAULT ''"],['group_size498','INTEGER NOT NULL DEFAULT 1'],['party_id498',"TEXT NOT NULL DEFAULT ''"],['creator_id498',"TEXT NOT NULL DEFAULT ''"]])if(!columns.has(name))db.exec(`ALTER TABLE arena_queue ADD COLUMN ${name} ${type}`);
  // Existing waiting rooms retain their oldest queued member as owner.
  db.exec(`UPDATE arena_queue SET creator_id498=(SELECT host.player_id FROM arena_queue host WHERE host.room_id=arena_queue.room_id ORDER BY host.queued_at_ms,host.player_id LIMIT 1) WHERE creator_id498='';
    CREATE INDEX IF NOT EXISTS idx_arena_queue_group498 ON arena_queue(queue_group498) WHERE queue_group498!='';
    CREATE INDEX IF NOT EXISTS idx_arena_queue_party498 ON arena_queue(party_id498) WHERE party_id498!='';
    DROP TRIGGER IF EXISTS arena_queue_delete498;
    DROP TRIGGER IF EXISTS arena_party_leave498;
    DROP TRIGGER IF EXISTS arena_party_join498;
    DROP TRIGGER IF EXISTS arena_party_change498;
    CREATE TRIGGER IF NOT EXISTS arena_queue_delete498 AFTER DELETE ON arena_queue BEGIN
      DELETE FROM arena_queue WHERE room_id=OLD.room_id AND creator_id498=OLD.creator_id498 AND (OLD.creator_id498=OLD.player_id OR (OLD.queue_group498!='' AND EXISTS(SELECT 1 FROM arena_queue creator WHERE creator.player_id=OLD.creator_id498 AND creator.queue_group498=OLD.queue_group498)));
      DELETE FROM arena_queue WHERE OLD.queue_group498!='' AND queue_group498=OLD.queue_group498;
    END;
    CREATE TRIGGER IF NOT EXISTS arena_party_leave498 AFTER DELETE ON party_members BEGIN
      DELETE FROM arena_queue WHERE party_id498=OLD.party_id OR player_id=OLD.player_id OR player_id IN (SELECT player_id FROM party_members WHERE party_id=OLD.party_id);
    END;
    CREATE TRIGGER IF NOT EXISTS arena_party_join498 AFTER INSERT ON party_members BEGIN
      DELETE FROM arena_queue WHERE party_id498=NEW.party_id OR player_id IN (SELECT player_id FROM party_members WHERE party_id=NEW.party_id);
    END;
    CREATE TRIGGER IF NOT EXISTS arena_party_change498 AFTER UPDATE OF party_id,player_id ON party_members BEGIN
      DELETE FROM arena_queue WHERE party_id498 IN (OLD.party_id,NEW.party_id) OR player_id IN (OLD.player_id,NEW.player_id) OR player_id IN (SELECT player_id FROM party_members WHERE party_id IN (OLD.party_id,NEW.party_id));
    END;`);
}

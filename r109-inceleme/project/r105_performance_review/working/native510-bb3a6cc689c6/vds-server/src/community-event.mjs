import {randomUUID} from 'node:crypto';
import {defaultCommunityConfig,validateCommunityConfig,CLAIM_GRACE_SECONDS} from '../../lib/community-event.mjs';

// These ledgers deliberately have no cascading player/world foreign keys: a
// routine world reset or normal receipt cleanup must not erase earned rights.
export function ensureCommunitySchema(sql){sql.exec(`
 CREATE TABLE IF NOT EXISTS community_runs(id TEXT PRIMARY KEY,config_json TEXT NOT NULL,start_at INTEGER NOT NULL,end_at INTEGER NOT NULL,published INTEGER NOT NULL DEFAULT 0,total INTEGER NOT NULL DEFAULT 0,completed_at INTEGER NOT NULL DEFAULT 0,revision INTEGER NOT NULL DEFAULT 1,created_at INTEGER NOT NULL);
 CREATE INDEX IF NOT EXISTS idx_community_runs_time ON community_runs(published,end_at,start_at);
 CREATE TABLE IF NOT EXISTS community_kills(event_id TEXT NOT NULL,cycle INTEGER NOT NULL,monster_id TEXT NOT NULL,spawn_round INTEGER NOT NULL,defeated_at INTEGER NOT NULL,PRIMARY KEY(event_id,cycle,monster_id,spawn_round));
 CREATE TABLE IF NOT EXISTS community_contributions(event_id TEXT NOT NULL,account_id TEXT NOT NULL,cycle INTEGER NOT NULL,monster_id TEXT NOT NULL,spawn_round INTEGER NOT NULL,PRIMARY KEY(event_id,account_id,cycle,monster_id,spawn_round));
 CREATE TABLE IF NOT EXISTS community_progress(event_id TEXT NOT NULL,account_id TEXT NOT NULL,kills INTEGER NOT NULL DEFAULT 0,PRIMARY KEY(event_id,account_id));
 CREATE TABLE IF NOT EXISTS community_claims(event_id TEXT NOT NULL,account_id TEXT NOT NULL,stage INTEGER NOT NULL,player_id TEXT NOT NULL,rewards_json TEXT NOT NULL,created_at INTEGER NOT NULL,PRIMARY KEY(event_id,account_id,stage));
 CREATE TABLE IF NOT EXISTS community_audit(id TEXT PRIMARY KEY,event_id TEXT NOT NULL,actor TEXT NOT NULL,action TEXT NOT NULL,detail_json TEXT NOT NULL,created_at INTEGER NOT NULL);
 CREATE TRIGGER IF NOT EXISTS community_normal_death AFTER INSERT ON normal_defeats BEGIN
  INSERT OR IGNORE INTO community_kills(event_id,cycle,monster_id,spawn_round,defeated_at)
  SELECT r.id,w.cycle,NEW.monster_id,NEW.spawn_round,NEW.defeated_at FROM community_runs r
  JOIN monsters m ON m.id=NEW.monster_id AND m.spawn_round=NEW.spawn_round JOIN world_state w ON w.id=1
  WHERE r.published=1 AND NEW.defeated_at>=r.start_at AND NEW.defeated_at<r.end_at
   AND m.area='forest' AND m.is_boss=0 AND m.is_stone=0 AND m.summoned=0;
 END;
 CREATE TRIGGER IF NOT EXISTS community_count_death AFTER INSERT ON community_kills BEGIN
  UPDATE community_runs SET total=total+1,completed_at=CASE WHEN completed_at=0 AND total+1>=json_extract(config_json,'$.stages[2].target') THEN NEW.defeated_at ELSE completed_at END WHERE id=NEW.event_id;
 END;
 CREATE TRIGGER IF NOT EXISTS community_capture_participants AFTER INSERT ON community_kills BEGIN
  INSERT OR IGNORE INTO community_contributions(event_id,account_id,cycle,monster_id,spawn_round)
  SELECT NEW.event_id,p.account_id,NEW.cycle,NEW.monster_id,NEW.spawn_round
  FROM monster_participants mp JOIN players p ON p.id=mp.player_id JOIN community_runs r ON r.id=NEW.event_id
  WHERE mp.monster_id=NEW.monster_id AND mp.spawn_round=NEW.spawn_round AND p.account_id IS NOT NULL AND p.account_id!=''
   AND mp.created_at>=r.start_at AND mp.created_at<=NEW.defeated_at;
 END;
 CREATE TRIGGER IF NOT EXISTS community_count_participant AFTER INSERT ON community_contributions BEGIN
  INSERT INTO community_progress(event_id,account_id,kills) VALUES(NEW.event_id,NEW.account_id,1)
  ON CONFLICT(event_id,account_id) DO UPDATE SET kills=kills+1;
 END;
 `);}
const COLUMNS={gems:'gems',potions:'potions',essence:'essence',pearl:'pearls',stone_dust:'stone_dust',enchant_scroll:'enchant_scrolls'};
export function createCommunityEvent(sql,{now=()=>Math.floor(Date.now()/1000)}={}){
 const transaction=fn=>{sql.exec('BEGIN IMMEDIATE');try{const result=fn();sql.exec('COMMIT');return result;}catch(e){sql.exec('ROLLBACK');throw e;}};
 const rows=()=>sql.prepare('SELECT * FROM community_runs ORDER BY created_at DESC,rowid DESC LIMIT 20').all();
 const view=(r,accountId='')=>{const config=JSON.parse(r.config_json);const personal=accountId?Number(sql.prepare('SELECT kills FROM community_progress WHERE event_id=? AND account_id=?').get(r.id,accountId)?.kills??0):0;const claimed=accountId?sql.prepare('SELECT stage FROM community_claims WHERE event_id=? AND account_id=?').all(r.id,accountId).map(x=>x.stage):[];return {id:r.id,...config,start:r.start_at,end:r.end_at,published:Boolean(r.published),total:r.total,completedAt:r.completed_at,revision:r.revision,personal,claimed,claimUntil:r.end_at+CLAIM_GRACE_SECONDS};};
 const read=accountId=>({runs:sql.prepare('SELECT * FROM community_runs WHERE published=1 AND end_at+?>? ORDER BY start_at DESC LIMIT 20').all(CLAIM_GRACE_SECONDS,now()).map(r=>view(r,accountId)),serverTime:now(),sampledAtMs:Date.now()});
 const progress=accountId=>{
  const time=now(),r=sql.prepare('SELECT id,total,completed_at,revision FROM community_runs WHERE published=1 AND start_at<=? AND end_at>? ORDER BY start_at DESC LIMIT 1').get(time,time-5);
  if(!r)return null;
  const result={id:r.id,total:r.total,completedAt:r.completed_at,revision:r.revision};
  if(accountId)result.personal=Number(sql.prepare('SELECT kills FROM community_progress WHERE event_id=? AND account_id=?').get(r.id,accountId)?.kills??0);
  return result;
 };
 const occupiedRooms=()=>({cycle:Number(sql.prepare('SELECT cycle FROM world_state WHERE id=1').get()?.cycle??1),rooms:sql.prepare('SELECT DISTINCT channel,area,arena_match_id FROM players WHERE last_seen>=?').all(now()-45).map(r=>({channel:r.channel,area:r.area,arenaMatchId:r.arena_match_id??''}))});
 const adminRead=()=>({runs:rows().map(r=>view(r)),defaults:defaultCommunityConfig(),serverTime:now()});
 function manage(actor,body){return transaction(()=>{
  const time=now();let r=body.id?sql.prepare('SELECT * FROM community_runs WHERE id=?').get(String(body.id)):null;
  if(body.id&&!r)throw new Error('Etkinlik bulunamadı.');
  if(r&&body.revision!==r.revision)throw new Error('Etkinlik başka bir pencerede değişti. Yenileyip tekrar dene.');
  let id=r?.id??randomUUID();
  if(body.action==='save'||body.action==='publish'){
   if(r?.published&&time>=r.start_at)throw new Error('Başlamış etkinliğin hedef ve ödülleri değiştirilemez.');
   const config=validateCommunityConfig(body.config),start=body.start==='now'?time:body.start,end=start+body.duration;
   if(!Number.isInteger(start)||start<time||start>time+366*86400||!Number.isInteger(body.duration)||body.duration<60||body.duration>30*86400)throw new Error('Başlangıç gelecekte; süre 1 dakika–30 gün arasında olmalı.');
   const published=body.action==='publish'?1:0;
   if(published&&sql.prepare('SELECT id FROM community_runs WHERE id!=? AND published=1 AND start_at<? AND end_at>? LIMIT 1').get(id,end,start))throw new Error('Bu saatlerde başka bir ortak etkinlik var.');
   if(r)sql.prepare('UPDATE community_runs SET config_json=?,start_at=?,end_at=?,published=?,revision=revision+1 WHERE id=?').run(JSON.stringify(config),start,end,published,id);
   else sql.prepare('INSERT INTO community_runs(id,config_json,start_at,end_at,published,created_at) VALUES(?,?,?,?,?,?)').run(id,JSON.stringify(config),start,end,published,time);
  }else if(body.action==='extend'){
   if(!r?.published||time>=r.end_at||!Number.isInteger(body.seconds)||body.seconds<60||body.seconds>7*86400||r.end_at+body.seconds>r.start_at+30*86400)throw new Error('Süren etkinlik en fazla 30 güne uzatılabilir.');
   const end=r.end_at+body.seconds;if(sql.prepare('SELECT id FROM community_runs WHERE id!=? AND published=1 AND start_at<? AND end_at>? LIMIT 1').get(id,end,r.start_at))throw new Error('Uzatma başka etkinlikle çakışıyor.');
   sql.prepare('UPDATE community_runs SET end_at=?,revision=revision+1 WHERE id=?').run(end,id);
  }else if(body.action==='stop'){
   if(!r?.published||time>=r.end_at)throw new Error('Etkinlik zaten kapalı.');
   if(time<r.start_at)sql.prepare('UPDATE community_runs SET published=0,revision=revision+1 WHERE id=?').run(id);
   else sql.prepare('UPDATE community_runs SET end_at=?,revision=revision+1 WHERE id=?').run(time,id);
  }else throw new Error('Geçersiz yönetim işlemi.');
  sql.prepare('INSERT INTO community_audit VALUES(?,?,?,?,?,?)').run(randomUUID(),id,actor,body.action,JSON.stringify(body),time);
  return adminRead();
 });}
 function claim(accountId,playerId,eventId,stage){return transaction(()=>{
  if(typeof eventId!=='string'||!Number.isInteger(stage)||stage<0||stage>2)throw new Error('Ödül seçimi geçersiz.');
  const player=sql.prepare('SELECT * FROM players WHERE id=? AND account_id=?').get(playerId,accountId);if(!player)throw new Error('Karakter sahipliği doğrulanamadı.');
  const old=sql.prepare('SELECT rewards_json FROM community_claims WHERE event_id=? AND account_id=? AND stage=?').get(eventId,accountId,stage);
  if(old)return {ok:true,alreadyClaimed:true,rewards:JSON.parse(old.rewards_json),community:read(accountId)};
  const r=sql.prepare('SELECT * FROM community_runs WHERE id=?').get(eventId),time=now();
  if(!r?.published||time<r.start_at||time>=r.end_at+CLAIM_GRACE_SECONDS)throw new Error('Ödül alma süresi açık değil.');
  const config=validateCommunityConfig(JSON.parse(r.config_json)),reward=config.stages[stage];
  const personal=sql.prepare('SELECT kills FROM community_progress WHERE event_id=? AND account_id=?').get(eventId,accountId)?.kills??0;
  if(personal<config.minimum)throw new Error('Kişisel katkı hedefin henüz tamamlanmadı.');
  if(r.total<reward.target)throw new Error('Ortak hedef henüz tamamlanmadı.');
  for(const item of reward.rewards){const previous=item.kind==='stone_art_book'?(sql.prepare("SELECT amount FROM player_stones WHERE player_id=? AND kind='book'").get(playerId)?.amount??0):player[COLUMNS[item.kind]];if(!Number.isSafeInteger(previous)||previous<0||previous+item.amount>2147483647)throw new Error('Ödül için kaynak üst sınırı aşılıyor.');}
  sql.prepare('INSERT INTO community_claims VALUES(?,?,?,?,?,?)').run(eventId,accountId,stage,playerId,JSON.stringify(reward.rewards),time);
  for(const item of reward.rewards){if(item.kind==='stone_art_book')sql.prepare("INSERT INTO player_stones(player_id,kind,amount) VALUES(?,'book',?) ON CONFLICT(player_id,kind) DO UPDATE SET amount=amount+excluded.amount").run(playerId,item.amount);else sql.prepare(`UPDATE players SET ${COLUMNS[item.kind]}=${COLUMNS[item.kind]}+? WHERE id=? AND account_id=?`).run(item.amount,playerId,accountId);}
  return {ok:true,alreadyClaimed:false,rewards:reward.rewards,community:read(accountId)};
 });}
 return {read,progress,occupiedRooms,adminRead,manage,claim};
}

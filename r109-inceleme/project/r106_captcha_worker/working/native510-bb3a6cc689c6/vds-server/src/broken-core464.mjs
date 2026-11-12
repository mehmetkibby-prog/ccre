import {randomUUID} from 'node:crypto';
import {battlePassXpSql} from '../../lib/battle-pass.mjs';
import {levelCosts} from '../../lib/level-progression.mjs';
import {playerLevelCap} from '../../lib/expansion65.mjs';
export const DEFAULT_CORE464=Object.freeze({enabled:false,minMinutes:15,maxMinutes:25,durationSec:20,xp:150,essence:10});
const reject=message=>{throw Object.assign(Error(message),{gameCode:'invalid_broken_core464',status:409});};
export function validateCore464(c){
 if(!c||typeof c.enabled!=='boolean')reject('Çekirdek ayarları geçersiz.');
 const bounds={minMinutes:[1,180],maxMinutes:[1,180],durationSec:[10,60],xp:[0,1000000],essence:[0,100000]};
 for(const [k,[lo,hi]] of Object.entries(bounds))if(!Number.isSafeInteger(c[k])||c[k]<lo||c[k]>hi)reject('Çekirdek '+k+' ayarı sınır dışında.');
 if(c.maxMinutes<c.minMinutes)reject('En uzun aralık en kısa aralıktan küçük olamaz.');
 return Object.fromEntries(Object.keys(DEFAULT_CORE464).map(k=>[k,c[k]]));
}
export function coreSettings464(db){const r=db.prepare('SELECT * FROM broken_core_settings464 WHERE id=1').get();return {revision:r.revision,config:{enabled:r.enabled===1,minMinutes:r.min_minutes,maxMinutes:r.max_minutes,durationSec:r.duration_sec,xp:r.xp,essence:r.essence}};}
const id464=v=>typeof v==='string'&&/^[A-Za-z0-9_-]{16,80}$/.test(v);
export function publicCoreSql464(alias='p'){
 if(!/^[a-z_]+$/.test(alias))throw Error('Invalid owner alias');
 return `COALESCE((SELECT json_object('id',s.puzzle_id,'area',s.area,'channel',s.channel,'template',s.template,'choices',json_array(json_object('id','a','shape',(s.template+3-s.correct_slot)%3),json_object('id','b','shape',(s.template+4-s.correct_slot)%3),json_object('id','c','shape',(s.template+5-s.correct_slot)%3)),'expiresAt',s.expires_at,'test',json(CASE WHEN s.test=1 THEN 'true' ELSE 'false' END),'xp',s.xp,'essence',s.essence) FROM broken_core_state464 s JOIN broken_core_settings464 c ON c.id=1 WHERE s.player_id=${alias}.id AND s.puzzle_id<>'' AND s.expires_at>unixepoch()*1000 AND s.area=${alias}.area AND s.channel=${alias}.channel AND s.scope_version=${alias}.realtime_scope_version AND ${alias}.hp>0 AND ${alias}.arena_match_id='' AND NOT EXISTS(SELECT 1 FROM dungeon_members WHERE player_id=${alias}.id) AND NOT EXISTS(SELECT 1 FROM pve_engagements e JOIN monsters b ON b.id=e.monster_id WHERE e.player_id=${alias}.id AND (b.is_boss=1 OR b.id='frozen-boss-1' OR b.id='ancient-boss-1' OR b.id='dragon-world-1' OR b.id LIKE 'frozen-water-c%' OR b.id IN ('rune-v2-boss-c1-1','rune-v2-boss-c2-1','rune-v2-boss-c3-1')) AND b.hp>0) AND s.config_revision=c.revision AND NOT EXISTS(SELECT 1 FROM guild_members gm JOIN guild_war_locks gl ON gl.guild_id=gm.guild_id WHERE gm.player_id=${alias}.id) AND (s.test=1 OR c.enabled=1)),'') AS broken_core464`;
}
export function ensureBrokenCore464(db){
 db.exec(`SAVEPOINT broken_core_schema464;
 CREATE TABLE IF NOT EXISTS broken_core_settings464(id INTEGER PRIMARY KEY CHECK(id=1),revision INTEGER NOT NULL DEFAULT 1,enabled INTEGER NOT NULL DEFAULT 0,min_minutes INTEGER NOT NULL DEFAULT 15,max_minutes INTEGER NOT NULL DEFAULT 25,duration_sec INTEGER NOT NULL DEFAULT 20,xp INTEGER NOT NULL DEFAULT 150,essence INTEGER NOT NULL DEFAULT 10);
 INSERT OR IGNORE INTO broken_core_settings464(id) VALUES(1);
 CREATE TABLE IF NOT EXISTS broken_core_state464(player_id TEXT PRIMARY KEY REFERENCES players(id) ON DELETE CASCADE,last_tick INTEGER NOT NULL DEFAULT 0,active_ms INTEGER NOT NULL DEFAULT 0,needed_ms INTEGER NOT NULL DEFAULT 0,seen1 INTEGER NOT NULL DEFAULT 0,seen2 INTEGER NOT NULL DEFAULT 0,seen3 INTEGER NOT NULL DEFAULT 0,puzzle_id TEXT NOT NULL DEFAULT '',template INTEGER NOT NULL DEFAULT 0,correct_slot INTEGER NOT NULL DEFAULT 0,expires_at INTEGER NOT NULL DEFAULT 0,area TEXT NOT NULL DEFAULT '',channel INTEGER NOT NULL DEFAULT 0,scope_version INTEGER NOT NULL DEFAULT 0,config_revision INTEGER NOT NULL DEFAULT 0,test INTEGER NOT NULL DEFAULT 0,xp INTEGER NOT NULL DEFAULT 0,essence INTEGER NOT NULL DEFAULT 0,last_request TEXT NOT NULL DEFAULT '',last_fingerprint TEXT NOT NULL DEFAULT '',last_result TEXT NOT NULL DEFAULT '');
 RELEASE broken_core_schema464;`);
}
// Install only on the authoritative writer after migration. TEMP dies with the
// connection, so V463 rollback cannot keep generating puzzles.
export function installBrokenCoreTrigger464(db){
 db.exec(`CREATE TEMP TRIGGER IF NOT EXISTS broken_core_kill464 AFTER INSERT ON main.monster_xp_claims
 WHEN (SELECT enabled FROM broken_core_settings464 WHERE id=1)=1
 AND NEW.awarded_at*1000-COALESCE((SELECT last_tick FROM broken_core_state464 WHERE player_id=NEW.player_id),0)>=30000
 AND EXISTS(SELECT 1 FROM monsters m JOIN players p ON p.id=NEW.player_id JOIN normal_defeats d ON d.monster_id=m.id AND d.spawn_round=m.spawn_round JOIN monster_participants mp ON mp.monster_id=m.id AND mp.spawn_round=m.spawn_round AND mp.player_id=p.id WHERE m.id=NEW.monster_id AND m.spawn_round=NEW.spawn_round AND m.hp>0 AND m.is_boss=0 AND m.id<>'frozen-boss-1' AND m.id<>'ancient-boss-1' AND m.id<>'dragon-world-1' AND m.id NOT LIKE 'frozen-water-c%' AND m.is_stone=0 AND m.summoned=0 AND (m.area='forest' OR m.area='frozen' OR m.area='ancient' OR m.area='rune' OR (m.area='rune_v2' AND m.id NOT IN ('rune-v2-boss-c1-1','rune-v2-boss-c2-1','rune-v2-boss-c3-1'))) AND p.area=m.area AND p.channel=m.channel AND p.hp>0 AND p.arena_match_id='' AND p.last_seen>=NEW.awarded_at-30 AND d.defeated_at=NEW.awarded_at)
 BEGIN
 INSERT INTO broken_core_state464(player_id,last_tick,needed_ms) VALUES(NEW.player_id,NEW.awarded_at*1000,(SELECT min_minutes*60000+abs(random()%((max_minutes-min_minutes)*60000+1)) FROM broken_core_settings464 WHERE id=1)) ON CONFLICT(player_id) DO UPDATE SET active_ms=MIN(10800000,active_ms+CASE WHEN excluded.last_tick-last_tick BETWEEN 30000 AND 90000 THEN excluded.last_tick-last_tick ELSE 0 END),last_tick=excluded.last_tick;

 END;
 CREATE TEMP TRIGGER IF NOT EXISTS broken_core_spawn464 AFTER UPDATE OF active_ms,last_tick ON main.broken_core_state464
 WHEN NEW.last_tick<>OLD.last_tick AND NEW.active_ms>=NEW.needed_ms AND NEW.needed_ms>0 AND NEW.seen1<=NEW.last_tick-3600000 AND NEW.expires_at<=NEW.last_tick
 AND (SELECT enabled FROM broken_core_settings464 WHERE id=1)=1
 AND NOT EXISTS(SELECT 1 FROM guild_members gm JOIN guild_war_locks gl ON gl.guild_id=gm.guild_id WHERE gm.player_id=NEW.player_id) AND NOT EXISTS(SELECT 1 FROM dungeon_members WHERE player_id=NEW.player_id) AND NOT EXISTS(SELECT 1 FROM pve_engagements e JOIN monsters b ON b.id=e.monster_id WHERE e.player_id=NEW.player_id AND (b.is_boss=1 OR b.id='frozen-boss-1' OR b.id='ancient-boss-1' OR b.id='dragon-world-1' OR b.id LIKE 'frozen-water-c%' OR b.id IN ('rune-v2-boss-c1-1','rune-v2-boss-c2-1','rune-v2-boss-c3-1')) AND b.hp>0)
 BEGIN UPDATE broken_core_state464 SET puzzle_id=lower(hex(randomblob(16))),template=abs(random()%3),correct_slot=abs(random()%3),expires_at=NEW.last_tick+(SELECT duration_sec*1000 FROM broken_core_settings464 WHERE id=1),area=(SELECT area FROM players WHERE id=NEW.player_id),channel=(SELECT channel FROM players WHERE id=NEW.player_id),scope_version=(SELECT realtime_scope_version FROM players WHERE id=NEW.player_id),config_revision=(SELECT revision FROM broken_core_settings464 WHERE id=1),test=0,xp=(SELECT xp FROM broken_core_settings464 WHERE id=1),essence=(SELECT essence FROM broken_core_settings464 WHERE id=1),active_ms=0,needed_ms=(SELECT min_minutes*60000+abs(random()%((max_minutes-min_minutes)*60000+1)) FROM broken_core_settings464 WHERE id=1),seen1=seen2,seen2=seen3,seen3=NEW.last_tick WHERE player_id=NEW.player_id;
 END;`);
}
function transact464(db,fn){if(db.isTransaction)reject('İşlem başka bir işlem içinde başlatılamaz.');db.exec('BEGIN IMMEDIATE');try{const r=fn();db.exec('COMMIT');return r;}catch(e){db.exec('ROLLBACK');throw e;}}
export function adminCore464(db,payload,adminId,{now=Date.now,uuid=randomUUID,random=Math.random}={}){
 if(!id464(payload.requestId))reject('Geçerli işlem kimliği gerekli.');
 const action=payload.action;if(!['save_broken_core464','send_broken_core464','revoke_broken_core464'].includes(action))reject('Bilinmeyen çekirdek işlemi.');
 const playerId=action==='save_broken_core464'?'':payload.playerId;if(action!=='save_broken_core464'&&(typeof playerId!=='string'||!/^[A-Za-z0-9-]{8,64}$/.test(playerId)))reject('Geçerli oyuncu gerekli.');
 const fingerprint=JSON.stringify([action,playerId,action==='save_broken_core464'?payload.expectedRevision:null,action==='save_broken_core464'?validateCore464(payload.config):null,action==='revoke_broken_core464'?payload.puzzleId:null]);
 return transact464(db,()=>{
  const key='core464:'+payload.requestId,prior=db.prepare('SELECT admin_account_id,action,detail_json FROM admin_audit_events WHERE id=?').get(key);
  if(prior){const d=JSON.parse(prior.detail_json);if(prior.admin_account_id!==adminId||prior.action!==action||d.fingerprint!==fingerprint)reject('İşlem kimliği başka bir isteğe ait.');return {...d.result,replayed:true};}
  let result,account='';
  if(action==='save_broken_core464'){
   const c=validateCore464(payload.config);if(!Number.isSafeInteger(payload.expectedRevision))reject('Ayar sürümü gerekli.');
   if(db.prepare('UPDATE broken_core_settings464 SET revision=revision+1,enabled=?,min_minutes=?,max_minutes=?,duration_sec=?,xp=?,essence=? WHERE id=1 AND revision=?').run(+c.enabled,c.minMinutes,c.maxMinutes,c.durationSec,c.xp,c.essence,payload.expectedRevision).changes!==1)reject('Ayar başka bir yerde değişti; paneli yenile.');
   result={ok:true,message:'Çekirdek ayarları kaydedildi.',...coreSettings464(db)};
  }else{
   const p=db.prepare('SELECT id,account_id,hp,area,channel,realtime_scope_version,arena_match_id,last_seen FROM players WHERE id=?').get(playerId);if(!p)reject('Oyuncu bulunamadı.');account=p.account_id;
   if(action==='revoke_broken_core464'){if(!id464(payload.puzzleId))reject('Geri almak için açık çekirdek kimliği gerekli.');if(db.prepare("UPDATE broken_core_state464 SET puzzle_id='',expires_at=0 WHERE player_id=? AND puzzle_id=?").run(playerId,payload.puzzleId).changes!==1)reject('Açık çekirdek değişti; paneli yenile.');result={ok:true,message:'Açık çekirdek kapatıldı; kazanılmış ödüller değişmedi.'};}
   else{
    const time=now();if(db.prepare("SELECT 1 FROM pve_engagements e JOIN monsters b ON b.id=e.monster_id WHERE e.player_id=? AND b.hp>0 AND (b.is_boss=1 OR b.id='frozen-boss-1' OR b.id='ancient-boss-1' OR b.id='dragon-world-1' OR b.id LIKE 'frozen-water-c%' OR b.id IN ('rune-v2-boss-c1-1','rune-v2-boss-c2-1','rune-v2-boss-c3-1'))").get(playerId))reject('Boss mücadelesinde çekirdek gönderilemez.');if(db.prepare('SELECT 1 FROM guild_members gm JOIN guild_war_locks gl ON gl.guild_id=gm.guild_id WHERE gm.player_id=?').get(playerId))reject('Lonca savaşı sırasında çekirdek gönderilemez.');if(p.hp<=0||p.last_seen<Math.floor(time/1000)-30||p.arena_match_id||!['forest','frozen','ancient','rune','rune_v2','bazaar','fishing','sanctum'].includes(p.area)||db.prepare('SELECT 1 FROM dungeon_members WHERE player_id=?').get(playerId))reject('Oyuncu çevrimiçi ve güvenli/normal bir haritada olmalı.');
    const old=db.prepare('SELECT puzzle_id,expires_at FROM broken_core_state464 WHERE player_id=?').get(playerId);if(old?.puzzle_id&&old.expires_at>time&&db.prepare('SELECT 1 FROM broken_core_state464 s JOIN broken_core_settings464 c ON c.id=1 WHERE s.player_id=? AND s.config_revision=c.revision AND s.area=? AND s.channel=? AND s.scope_version=? AND (s.test=1 OR c.enabled=1)').get(playerId,p.area,p.channel,p.realtime_scope_version))reject('Oyuncunun açık çekirdeği var; önce Geri Al.');
    const {revision,config:c}=coreSettings464(db),id=uuid().replaceAll('-','');
    db.prepare(`INSERT INTO broken_core_state464(player_id,needed_ms) VALUES(?,?) ON CONFLICT DO NOTHING`).run(playerId,c.minMinutes*60000+Math.floor(random()*((c.maxMinutes-c.minMinutes)*60000+1)));
    db.prepare("UPDATE broken_core_state464 SET puzzle_id=?,template=?,correct_slot=?,expires_at=?,area=?,channel=?,scope_version=?,config_revision=?,test=1,xp=?,essence=? WHERE player_id=?").run(id,Math.floor(random()*3),Math.floor(random()*3),time+c.durationSec*1000,p.area,p.channel,p.realtime_scope_version,revision,c.xp,c.essence,playerId);
    result={ok:true,id,message:'Test çekirdeği gönderildi. Doğru seçim gerçek TP ve öz verir; saatlik hakkı tüketmez.'};
   }
  }
  db.prepare('INSERT INTO admin_audit_events(id,admin_account_id,action,target_account_id,detail_json,created_at_ms) VALUES(?,?,?,?,?,?)').run(key,adminId,action,account,JSON.stringify({fingerprint,result}),now());return result;
 });
}
export function createBrokenCore464(db,{now=Date.now}={}){
 return {act(playerId,input){
  if(!db.isTransaction)reject('Kalıcı işlem sınırı gerekli.');
  if(!id464(input.requestId)||!Number.isSafeInteger(input.requestAt)||Math.abs(now()-input.requestAt)>600000||!id464(input.puzzleId))reject('Geçerli çekirdek isteği gerekli.');
  const dismiss=input.action==='dismiss_broken_core464';if(!dismiss&&input.action!=='answer_broken_core464')reject('Bilinmeyen seçim.');
  if(!dismiss&&!['a','b','c'].includes(input.choiceId))reject('Geçerli parçayı seç.');
  const fingerprint=JSON.stringify([input.action,input.puzzleId,input.choiceId??'']);
  const s=db.prepare('SELECT * FROM broken_core_state464 WHERE player_id=?').get(playerId);
  if(s?.last_request===input.requestId){if(s.last_fingerprint!==fingerprint)reject('İşlem kimliği başka bir seçime ait.');return {...JSON.parse(s.last_result),replayed:true};}
  if(!s||s.puzzle_id!==input.puzzleId)reject('Bu çekirdek artık açık değil.');
  const p=db.prepare('SELECT * FROM players WHERE id=?').get(playerId),c=coreSettings464(db),time=now();
  const valid=p&&p.hp>0&&p.area===s.area&&p.channel===s.channel&&p.realtime_scope_version===s.scope_version&&!p.arena_match_id&&s.expires_at>time&&s.config_revision===c.revision&&(s.test===1||c.config.enabled)&&!db.prepare('SELECT 1 FROM dungeon_members WHERE player_id=?').get(playerId)&&!db.prepare('SELECT 1 FROM guild_members gm JOIN guild_war_locks gl ON gl.guild_id=gm.guild_id WHERE gm.player_id=?').get(playerId);
  const bossFight=db.prepare("SELECT 1 FROM pve_engagements e JOIN monsters b ON b.id=e.monster_id WHERE e.player_id=? AND b.hp>0 AND (b.is_boss=1 OR b.id='frozen-boss-1' OR b.id='ancient-boss-1' OR b.id='dragon-world-1' OR b.id LIKE 'frozen-water-c%' OR b.id IN ('rune-v2-boss-c1-1','rune-v2-boss-c2-1','rune-v2-boss-c3-1'))").get(playerId);
  const correct=!!(valid&&!bossFight&&!dismiss&&['a','b','c'].indexOf(input.choiceId)===s.correct_slot);
  let earnedXp=0;
  if(correct){
   const settings=db.prepare('SELECT * FROM game_settings WHERE id=1').get()??{},costs=levelCosts(settings),cap=playerLevelCap(settings,p),xp=p.level>=cap?p.xp:Math.min(p.xp+s.xp,costs.slice(0,cap-1).reduce((a,b)=>a+b,0));
   let threshold=0,level=1;for(const cost of costs.slice(0,cap-1)){threshold+=cost;if(xp<threshold)break;level++;}
   earnedXp=p.level>=65&&p.rank_tier>0?Math.min(s.xp,9000000000000-p.rank_xp):Math.max(0,xp-p.xp);
   db.prepare(`UPDATE players SET ${battlePassXpSql(String(s.xp))},rank_xp=CASE WHEN level>=65 AND rank_tier>0 THEN MIN(9000000000000,rank_xp+?) ELSE rank_xp END,xp=?,level=?,essence=MIN(9000000000000,essence+?) WHERE id=?`).run(s.xp,xp,Math.max(p.level,level),s.essence,playerId);
  }
  const result={ok:true,correct,closed:true,xp:earnedXp,essence:correct?s.essence:0,message:correct?`Yaşam Çekirdeği tamamlandı! +${earnedXp} TP · +${s.essence} Öz`:dismiss?'Çekirdeği geçtin.':!valid?'Çekirdeğin süresi veya bulunduğun alan değişti.':'Bu parça uymadı. Yeni bir çekirdekte tekrar deneyebilirsin.'};
  if(db.prepare("UPDATE broken_core_state464 SET puzzle_id='',expires_at=0,last_request=?,last_fingerprint=?,last_result=? WHERE player_id=? AND puzzle_id=?").run(input.requestId,fingerprint,JSON.stringify(result),playerId,input.puzzleId).changes!==1)reject('Çekirdek değişti.');
  return result;
 }};
}

import {isMistArea} from './adventure-maps.mjs';
import {prepareCached477} from './writer-statements.mjs';
// Cache only the existing prepared-statement facade; every query still runs.
const potionStatementsR61=process.env.CORE511_R61_POTION_STATEMENTS==='1';
const preparePotionStatementR61=(sql,text)=>potionStatementsR61?prepareCached477(sql,text):sql.prepare(text);

export const MIST_LOOT_HOLD_MS=3000;
export const MIST_LOOT_RADIUS=120;
export const MIST_LOOT_BALANCE_LIMIT=9000000000000;
export {MIST_LOOT_ACTIONS} from './mist-loot-actions.mjs';
const rule=message=>{throw Object.assign(Error(message),{adventureRule:true});};
const inputObject=input=>{if(!input||typeof input!=='object'||Array.isArray(input))rule('Sandık işlemi geçersiz; yeniden dene.');return input;};
const lootId=(value,message)=>{if(typeof value!=='string'||!/^[A-Za-z0-9_-]{16,80}$/.test(value))rule(message);return value;};
const transaction=sql=>{if(!sql.isTransaction)throw Error('mist_loot_requires_writer_transaction');};
const attackState=p=>JSON.stringify(['attack_one_at','attack_two_at','attack_three_at','attack_four_at'].map(key=>p[key]??0));
const safeBalance=v=>Number.isSafeInteger(v)&&v>=0&&v<=MIST_LOOT_BALANCE_LIMIT;
const chestView=c=>({id:c.id,runId:c.run_id,channel:c.channel,area:c.area,ownerId:c.owner_id,ownerName:c.owner_name,x:c.x,y:c.y,essence:c.essence,gems:c.gems,expiresAt:c.expires_ms});

// Additive, durable escrow. No triggers on players, no periodic whole-world
// writes. Every debit/claim shares its caller's sole-writer transaction/receipt.
export function createMistLootSchema(sql){
 sql.exec(`CREATE TABLE IF NOT EXISTS mist_loot_chests(
  id TEXT PRIMARY KEY,run_id TEXT NOT NULL,channel INTEGER NOT NULL CHECK(channel BETWEEN 1 AND 4),area TEXT NOT NULL,
  owner_id TEXT NOT NULL,owner_name TEXT NOT NULL,death_revision INTEGER NOT NULL,
  x REAL NOT NULL,y REAL NOT NULL,essence INTEGER NOT NULL CHECK(typeof(essence)='integer' AND essence>=0),gems INTEGER NOT NULL CHECK(typeof(gems)='integer' AND gems>=0),
  created_ms INTEGER NOT NULL,expires_ms INTEGER NOT NULL,status TEXT NOT NULL CHECK(status IN ('open','claimed','refund_pending','refunded')),
  claimed_by TEXT NOT NULL DEFAULT '',settled_ms INTEGER NOT NULL DEFAULT 0,
  UNIQUE(run_id,owner_id,death_revision));
 CREATE INDEX IF NOT EXISTS mist_loot_live_run ON mist_loot_chests(run_id,status,expires_ms);
 CREATE INDEX IF NOT EXISTS mist_loot_refunds ON mist_loot_chests(owner_id,status);
 CREATE TABLE IF NOT EXISTS mist_loot_attempts(
  player_id TEXT PRIMARY KEY,chest_id TEXT NOT NULL,token TEXT NOT NULL,started_ms INTEGER NOT NULL,
  position_revision INTEGER NOT NULL,hp_revision INTEGER NOT NULL,scope_version INTEGER NOT NULL,
  owner_epoch INTEGER NOT NULL,connection_id TEXT NOT NULL,x REAL NOT NULL,y REAL NOT NULL,attack_state TEXT NOT NULL);
 CREATE INDEX IF NOT EXISTS mist_loot_attempt_chest ON mist_loot_attempts(chest_id);
 CREATE TABLE IF NOT EXISTS mist_loot_revisions(run_id TEXT PRIMARY KEY,revision INTEGER NOT NULL CHECK(revision>=0));`);
}

export function readMistLootRevision(sql,runId){return sql.prepare('SELECT revision FROM mist_loot_revisions WHERE run_id=?').get(runId)?.revision??0;}
const advanceRevision=(sql,runId)=>sql.prepare('INSERT INTO mist_loot_revisions VALUES(?,1) ON CONFLICT(run_id) DO UPDATE SET revision=revision+1').run(runId);

export function readMistLoot(sql,{runId=null,channel=null,now=Date.now()}={}){
 if(runId)return sql.prepare("SELECT * FROM mist_loot_chests WHERE run_id=? AND status='open' AND expires_ms>? ORDER BY created_ms,id").all(runId,now).map(chestView);
 if(Number.isInteger(channel))return sql.prepare("SELECT c.* FROM mist_loot_chests c JOIN adventure_runs r ON r.id=c.run_id WHERE c.channel=? AND c.status='open' AND c.expires_ms>? AND r.status='active' ORDER BY c.created_ms,c.id").all(channel,now).map(chestView);
 return [];
}

// This body is also embedded verbatim in the stopped-server rollback helper.
// Refuse an uncreditable escrow; never silently cap, discard or overwrite DB.
export function refundAllMistLoot(sql,{now=Date.now()}={}){
 if(!sql.isTransaction)throw Error('mist_loot_refund_requires_transaction');
 const tables=sql.prepare("SELECT name FROM sqlite_schema WHERE type='table' AND name IN ('mist_loot_chests','mist_loot_attempts','mist_loot_revisions')").all();
 if(!tables.length)return {ok:true,refunded:0,essence:0,gems:0};
 if(tables.length!==3)throw Error('mist_loot_schema_incomplete');
 const rows=sql.prepare("SELECT * FROM mist_loot_chests WHERE status IN ('open','refund_pending') ORDER BY id").all();
 let essence=0,gems=0;
 for(const row of rows){
  const p=sql.prepare('SELECT essence,gems FROM players WHERE id=?').get(row.owner_id);
  if(!p||![row.essence,row.gems,p.essence,p.gems].every(v=>Number.isSafeInteger(v)&&v>=0)||!Number.isSafeInteger(p.essence+row.essence)||!Number.isSafeInteger(p.gems+row.gems)||p.essence+row.essence>9000000000000||p.gems+row.gems>9000000000000)throw Error('mist_loot_refund_balance_unavailable:'+row.id);
  sql.prepare('UPDATE players SET essence=essence+?,gems=gems+? WHERE id=?').run(row.essence,row.gems,row.owner_id);
  sql.prepare("UPDATE mist_loot_chests SET status='refunded',settled_ms=? WHERE id=? AND status IN ('open','refund_pending')").run(now,row.id);
  essence+=row.essence;gems+=row.gems;
 }
 sql.prepare('DELETE FROM mist_loot_attempts').run();
 return {ok:true,refunded:rows.length,essence,gems};
}

export class MistLootService{
 constructor(sql,{now=Date.now,uuid}={}){Object.assign(this,{sql,now,uuid});}
 snapshot(runId){return {runId,revision:readMistLootRevision(this.sql,runId),loot:readMistLoot(this.sql,{runId,now:this.now()})};}
 capture(actorId){
  const actor=this.sql.prepare('SELECT id,channel,area FROM players WHERE id=?').get(actorId);
  if(!actor||!isMistArea(actor.area))return null;
  const run=this.sql.prepare("SELECT r.* FROM adventure_runs r JOIN adventure_members m ON m.run_id=r.id WHERE m.player_id=? AND m.departed=0 AND r.kind='mist' AND r.status='active' AND r.channel=? AND r.area=?").get(actorId,actor.channel,actor.area);
  if(!run||run.deadline_ms<=this.now())return null;
  return {actorId,run,players:new Map(this.sql.prepare('SELECT p.* FROM players p JOIN adventure_members m ON m.player_id=p.id WHERE m.run_id=? AND m.departed=0 AND p.area=? AND p.channel=? AND p.hp>0').all(run.id,run.area,run.channel).map(p=>[p.id,p]))};
 }
 settleDeaths(snapshot,body,events=[]){
  transaction(this.sql);if(!snapshot||!body)return [];
  const candidates=[...(body.pvpHits??[]),...(body.hits??[]),...(body.targetId?[body]:[])],seen=new Set(),created=[];
  for(const hit of candidates){
   if(!hit?.killed||typeof hit.targetId!=='string'||seen.has(hit.targetId)||hit.targetId===snapshot.actorId)continue;seen.add(hit.targetId);
   const old=snapshot.players.get(hit.targetId),p=old&&this.sql.prepare('SELECT * FROM players WHERE id=?').get(old.id);
   if(!p||old.hp<=0||p.hp>0||p.hp_revision<=old.hp_revision||p.channel!==snapshot.run.channel||p.area!==snapshot.run.area)continue;
   if(!safeBalance(p.essence)||!safeBalance(p.gems))throw Error('mist_loot_invalid_currency');
   const now=this.now(),gems=Math.floor(p.gems*15/100),essence=p.essence,id=this.uuid();
   const inserted=this.sql.prepare("INSERT OR IGNORE INTO mist_loot_chests(id,run_id,channel,area,owner_id,owner_name,death_revision,x,y,essence,gems,created_ms,expires_ms,status) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,'open')").run(id,snapshot.run.id,p.channel,p.area,p.id,p.name,p.hp_revision,p.x,p.y,essence,gems,now,snapshot.run.deadline_ms);
   if(!inserted.changes)continue;advanceRevision(this.sql,snapshot.run.id);
   this.sql.prepare('UPDATE players SET essence=0,gems=gems-? WHERE id=?').run(gems,p.id);
   this.sql.prepare('DELETE FROM mist_loot_attempts WHERE player_id=?').run(p.id);
   const view=chestView(this.sql.prepare('SELECT * FROM mist_loot_chests WHERE id=?').get(id));created.push(view);
   // Existing buffered publications run only after durable ACK. Currency in
   // pvp_result must agree with the committed escrow, including mixed casts.
   const update=value=>{if(!value||typeof value!=='object')return;if((value.targetId===p.id||value.id===p.id)&&('targetGems' in value||value.type==='pvp_result')){value.targetGems=p.gems-gems;value.pvpGemsLost479=null;value.mistLootId=id;}if(Array.isArray(value))for(const child of value)update(child);else for(const [key,child]of Object.entries(value))if(key==='body'||key==='hits'||key==='pvpHits')update(child);};
   update(body);for(const args of events)for(const value of args)update(value);
  }
  return created;
 }
 context(actorId,input,identity){
  const chestId=lootId(inputObject(input).chestId,'Sandık seçimi geçersiz; yeniden dokun.');
  const p=this.sql.prepare('SELECT * FROM players WHERE id=?').get(actorId),c=this.sql.prepare('SELECT * FROM mist_loot_chests WHERE id=?').get(chestId),now=this.now();
  if(!p||p.hp<=0||!c||c.status!=='open'||c.expires_ms<=now||p.channel!==c.channel||p.area!==c.area||Math.hypot(p.x-c.x,p.y-c.y)>MIST_LOOT_RADIUS)rule('Sandık alındı, süresi doldu veya yeterince yakın değilsin.');
  const run=this.sql.prepare("SELECT r.id FROM adventure_runs r JOIN adventure_members m ON m.run_id=r.id WHERE r.id=? AND m.player_id=? AND m.departed=0 AND r.kind='mist' AND r.status='active' AND r.deadline_ms>? AND r.channel=? AND r.area=? AND r.cycle=(SELECT cycle FROM world_state WHERE id=1)").get(c.run_id,actorId,now,p.channel,p.area);
  if(!run)rule('Bu sandığı yalnız aynı Sis Yarığı içinde alabilirsin.');
  if(!Number.isSafeInteger(identity?.epoch)||identity.epoch<1||typeof identity?.connectionId!=='string'||identity.connectionId.length<16||identity.connectionId.length>160)rule('Bağlantın yenilendi; sandığa yeniden dokun.');
  return {p,c,now};
 }
 begin(actorId,input,identity){
  transaction(this.sql);const {p,c,now}=this.context(actorId,input,identity),token=this.uuid();
  this.sql.prepare('INSERT INTO mist_loot_attempts VALUES(?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(player_id) DO UPDATE SET chest_id=excluded.chest_id,token=excluded.token,started_ms=excluded.started_ms,position_revision=excluded.position_revision,hp_revision=excluded.hp_revision,scope_version=excluded.scope_version,owner_epoch=excluded.owner_epoch,connection_id=excluded.connection_id,x=excluded.x,y=excluded.y,attack_state=excluded.attack_state').run(actorId,c.id,token,now,p.position_revision,p.hp_revision,p.realtime_scope_version,identity.epoch,identity.connectionId,p.x,p.y,attackState(p));
  return {ok:true,chestId:c.id,token,startedAt:now,readyAt:now+MIST_LOOT_HOLD_MS,durationMs:MIST_LOOT_HOLD_MS,message:'Sandık açılıyor…'};
 }
 finish(actorId,input,identity){
  transaction(this.sql);lootId(inputObject(input).token,'Sandık açma kimliği geçersiz; yeniden dokun.');const {p,c,now}=this.context(actorId,input,identity),attempt=this.sql.prepare('SELECT * FROM mist_loot_attempts WHERE player_id=?').get(actorId);
  if(!attempt||attempt.chest_id!==c.id||attempt.token!==input.token||attempt.connection_id!==identity.connectionId||attempt.owner_epoch!==identity.epoch||attempt.position_revision!==p.position_revision||attempt.hp_revision!==p.hp_revision||attempt.scope_version!==p.realtime_scope_version||attempt.attack_state!==attackState(p)||attempt.x!==p.x||attempt.y!==p.y)rule('Sandık açma kesildi; durup yeniden dokun.');
  if(now<attempt.started_ms+MIST_LOOT_HOLD_MS)rule('Sandığın açılması için 3 saniye beklemelisin.');
  if(now>attempt.started_ms+15000)rule('Sandık açma süresi geçti; yeniden dokun.');
  if(!safeBalance(p.essence)||!safeBalance(p.gems)||p.essence+c.essence>MIST_LOOT_BALANCE_LIMIT||p.gems+c.gems>MIST_LOOT_BALANCE_LIMIT)rule('Öz veya mücevher sınırın nedeniyle bu sandığı alamıyorsun.');
  const claim=this.sql.prepare("UPDATE mist_loot_chests SET status='claimed',claimed_by=?,settled_ms=? WHERE id=? AND status='open' AND expires_ms>?").run(actorId,now,c.id,now);
  if(!claim.changes)rule('Sandığı başka bir oyuncu aldı.');advanceRevision(this.sql,c.run_id);
  this.sql.prepare('UPDATE players SET essence=essence+?,gems=gems+? WHERE id=?').run(c.essence,c.gems,actorId);
  this.sql.prepare('DELETE FROM mist_loot_attempts WHERE chest_id=?').run(c.id);
  return {ok:true,chestId:c.id,collected:true,essence:c.essence,gems:c.gems,message:`${c.owner_name} sandığı: +${c.essence} Öz, +${c.gems} Mücevher.`};
 }
 cancel(actorId,input={}){transaction(this.sql);inputObject(input);const token=input.token==null?null:lootId(input.token,'Sandık açma kimliği geçersiz; yeniden dokun.');this.sql.prepare('DELETE FROM mist_loot_attempts WHERE player_id=? AND (? IS NULL OR token=?)').run(actorId,token,token);return {ok:true,cancelled:true};}
 closeRun(runId){transaction(this.sql);const changed=this.sql.prepare("UPDATE mist_loot_chests SET status='refund_pending' WHERE run_id=? AND status='open'").run(runId);if(changed.changes)advanceRevision(this.sql,runId);this.sql.prepare('DELETE FROM mist_loot_attempts WHERE chest_id IN (SELECT id FROM mist_loot_chests WHERE run_id=?)').run(runId);}
 refundPlayer(actorId){
  transaction(this.sql);const now=this.now();
  preparePotionStatementR61(this.sql,"UPDATE mist_loot_chests SET status='refund_pending' WHERE owner_id=? AND status='open' AND (expires_ms<=? OR NOT EXISTS(SELECT 1 FROM adventure_runs r WHERE r.id=mist_loot_chests.run_id AND r.status='active' AND r.cycle=(SELECT cycle FROM world_state WHERE id=1)))").run(actorId,now);
  const rows=preparePotionStatementR61(this.sql,"SELECT * FROM mist_loot_chests WHERE owner_id=? AND status='refund_pending' ORDER BY id").all(actorId);let refunded=0;
  for(const row of rows){const p=this.sql.prepare('SELECT essence,gems FROM players WHERE id=?').get(actorId);if(!p||!safeBalance(p.essence)||!safeBalance(p.gems)||p.essence+row.essence>MIST_LOOT_BALANCE_LIMIT||p.gems+row.gems>MIST_LOOT_BALANCE_LIMIT)continue;
   this.sql.prepare('UPDATE players SET essence=essence+?,gems=gems+? WHERE id=?').run(row.essence,row.gems,actorId);this.sql.prepare("UPDATE mist_loot_chests SET status='refunded',settled_ms=? WHERE id=?").run(now,row.id);refunded++;
  }
  return refunded;
 }
}

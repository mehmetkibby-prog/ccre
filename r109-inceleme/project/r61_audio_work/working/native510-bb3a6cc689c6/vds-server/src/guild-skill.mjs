import {feature504} from './features504.mjs';
import {measureSync504} from './runtime-performance.mjs';
import {deferDatabaseBackgroundTask} from './database.mjs';
import {GUILD_SKILL_LEVELS,GUILD_SKILL_DURATION,GUILD_SKILL_COOLDOWN,GUILD_ORB,EMPTY_GUILD_BUFF,guildSkillLevel} from '../../lib/guild-skill.mjs';
export function ensureGuildSkillSchema(db){db.exec(`
 CREATE TABLE IF NOT EXISTS guild_skills(guild_id TEXT PRIMARY KEY REFERENCES guild_castles(guild_id) ON DELETE CASCADE,level INTEGER NOT NULL DEFAULT 0 CHECK(level BETWEEN 0 AND 3),essence INTEGER NOT NULL DEFAULT 0 CHECK(essence>=0),active_level INTEGER NOT NULL DEFAULT 0,active_until INTEGER NOT NULL DEFAULT 0,ready_at INTEGER NOT NULL DEFAULT 0);
 CREATE TABLE IF NOT EXISTS guild_skill_receipts(player_id TEXT NOT NULL,request_id TEXT NOT NULL,payload TEXT NOT NULL,result TEXT NOT NULL,PRIMARY KEY(player_id,request_id));
 CREATE TABLE IF NOT EXISTS guild_skill_donations(guild_id TEXT NOT NULL REFERENCES guild_castles(guild_id) ON DELETE CASCADE,player_id TEXT NOT NULL,amount INTEGER NOT NULL,created_at INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS guild_chat(id INTEGER PRIMARY KEY AUTOINCREMENT,guild_id TEXT NOT NULL REFERENCES guilds(id) ON DELETE CASCADE,player_id TEXT NOT NULL,player_name TEXT NOT NULL,body TEXT NOT NULL,created_at INTEGER NOT NULL);
 CREATE INDEX IF NOT EXISTS guild_chat_room ON guild_chat(guild_id,id);
 `);}
export function createGuildSkill(db,{now=Date.now,refreshHp=()=>{}}={}){
 const member=id=>db.prepare('SELECT g.id,g.leader_id,p.area,p.x,p.y,p.hp FROM guild_members m JOIN guilds g ON g.id=m.guild_id JOIN players p ON p.id=m.player_id WHERE m.player_id=?').get(id);
 const state=gid=>db.prepare('SELECT * FROM guild_skills WHERE guild_id=?').get(gid);
 const buffs=new Map();let syncJob=null;
 // Enabled only by the coordinator after both durable commit observers are
 // installed. Legacy/unobserved users retain the original full reconciliation.
 let observing=false,revision=0,syncedRevision=-1,nextExpiry=Infinity,scanStartedAt=-Infinity;
 const bonuses=id=>{const s=db.prepare('SELECT s.* FROM guild_skills s JOIN guild_members m ON m.guild_id=s.guild_id WHERE m.player_id=? AND s.active_until>?').get(id,now());return s?{...guildSkillLevel(s.active_level),until:s.active_until}:EMPTY_GUILD_BUFF;};
 function* syncSteps(){
  const startedAt=now(),startedRevision=revision;
  // No TTL: unchanged membership/skill rows can change HP only at their actual
 // expiry. A backwards clock forces a fresh reconciliation as well.
  if(observing&&syncedRevision===startedRevision&&startedAt>=scanStartedAt&&startedAt<nextExpiry)return;
  let expiry=Infinity;
  const cooperative504=feature504('cooperativeJobs');let unchanged504=0;
  let current;
  if(!cooperative504){
   current=new Map(db.prepare('SELECT m.player_id,s.active_level,s.active_until FROM guild_members m JOIN guild_skills s ON s.guild_id=m.guild_id').all().map(s=>{
   if(s.active_until>startedAt)expiry=Math.min(expiry,s.active_until);
   return [s.player_id,s.active_until>now()?guildSkillLevel(s.active_level).hp:0];
  }));
  }else{
   current=new Map();let prepared504=0;
   const rows504=db.prepare('SELECT m.player_id,s.active_level,s.active_until FROM guild_members m JOIN guild_skills s ON s.guild_id=m.guild_id').all();
   for(const s of rows504){
    if(s.active_until>startedAt)expiry=Math.min(expiry,s.active_until);
    current.set(s.player_id,s.active_until>now()?guildSkillLevel(s.active_level).hp:0);
    // Pure bounded map preparation. Never suspend an owner HP transaction.
    if(++prepared504%512===0)yield;
   }
  }
  for(const id of new Set([...buffs.keys(),...current.keys()])){
   if(buffs.get(id)===(current.get(id)??0)){if(!current.has(id))buffs.delete(id);if(cooperative504&&++unchanged504%512===0)yield;continue;}
   // Only changed owners need a second query. Re-read immediately before HP
   // correction; an activation between I/O turns must not apply stale stats.
   const hp=bonuses(id).hp??0;
   if(buffs.get(id)!==hp)yield refreshHp(id);
   if(current.has(id))buffs.set(id,hp);else buffs.delete(id);
   yield;
  }
  // Publish only the revision captured BEFORE the scan, and only after every
  // awaited HP repair succeeded. Mid-scan commits, cancellation and failures
  // must not mark newer state as reconciled.
  syncedRevision=startedRevision;nextExpiry=expiry;scanStartedAt=startedAt;
 }

 return {bonuses,
 observeCommits(){observing=true;revision++;},
 committed(changes){if(observing&&changes?.some(row=>row.table==='guild_members'||row.table==='guild_skills'))revision++;},
 read(id){const m=member(id);if(!m||!db.prepare('SELECT 1 FROM guild_castles WHERE guild_id=?').get(m.id))return null;return {...(state(m.id)??{level:0,essence:0,active_level:0,active_until:0,ready_at:0}),leader:m.leader_id===id,serverTime:now(),levels:GUILD_SKILL_LEVELS};},
 project(rows){if(!rows.length)return rows;const active=new Map(db.prepare(`SELECT m.player_id,s.active_level,s.active_until FROM guild_members m JOIN guild_skills s ON s.guild_id=m.guild_id WHERE s.active_until>? AND m.player_id IN (${rows.map(()=>'?').join(',')})`).all(now(),...rows.map(p=>p.id)).map(s=>[s.player_id,{...guildSkillLevel(s.active_level),until:s.active_until}]));return rows.map(p=>({...p,guildBuff:active.get(p.id)??EMPTY_GUILD_BUFF}));},
 sync(){for(const _ of syncSteps()){}},
 syncInBackground(available=()=>true){
  if(syncJob)return syncJob;
  syncJob=deferDatabaseBackgroundTask(async()=>{
   const steps=syncSteps();
   while(available()){
    const step=await deferDatabaseBackgroundTask(()=>available()?measureSync504('main_guild_step',()=>steps.next()):{done:true});
    if(step.done)break;
    await step.value;
   }
  }).finally(()=>{syncJob=null;});return syncJob;
 },
 act(id,body){db.exec('BEGIN IMMEDIATE');try{
  const m=member(id);if(!m||!db.prepare('SELECT 1 FROM guild_castles WHERE guild_id=?').get(m.id))throw Error('Loncanızın bir şatosu olmalı.');
  if(!['activate','donate'].includes(body.action)||typeof body.requestId!=='string'||!/^[a-f0-9-]{36}$/.test(body.requestId))throw Error('İşlem kimliği geçersiz.');
  const payload=JSON.stringify({guild:m.id,action:body.action,amount:body.amount});
  const receipt=db.prepare('SELECT * FROM guild_skill_receipts WHERE player_id=? AND request_id=?').get(id,body.requestId);
  if(receipt){if(receipt.payload!==payload)throw Error('İşlem kimliği farklı bir istekte kullanılmış.');db.exec('COMMIT');return JSON.parse(receipt.result);}
  db.prepare('INSERT OR IGNORE INTO guild_skills(guild_id) VALUES(?)').run(m.id);const s=state(m.id);let message;
  if(body.action==='activate'){
   if(m.leader_id!==id)throw Error('Beceriyi yalnız lonca başkanı kullanabilir.');
   if(!s.level)throw Error('Önce salondaki Yeşil Küreyi geliştir.');
   if(s.ready_at>now())throw Error('Lonca becerisi henüz hazır değil.');
   db.prepare('UPDATE guild_skills SET active_level=level,active_until=?,ready_at=? WHERE guild_id=?').run(now()+GUILD_SKILL_DURATION,now()+GUILD_SKILL_COOLDOWN,m.id);message='Çekirdeğin Birliği 30 dakika etkin.';
  }else{
   if(m.area!=='guild_hall_'+m.id||Math.hypot(m.x-GUILD_ORB.x,m.y-GUILD_ORB.y)>220||m.hp<=0)throw Error('Bağış için kendi lonca salonundaki Yeşil Küreye yaklaş.');
   const next=guildSkillLevel(s.level+1),amount=Number(body.amount);
   if(!next)throw Error('Lonca becerisi en yüksek seviyede.');
   if(!Number.isSafeInteger(amount)||amount<1||amount>next.cost-s.essence)throw Error(`Bu kademe için en fazla ${next.cost-s.essence} öz bağışlanabilir.`);
   if(!db.prepare('UPDATE players SET essence=essence-? WHERE id=? AND essence>=?').run(amount,id,amount).changes)throw Error('Yeterli özün yok.');
   const completed=s.essence+amount===next.cost;
   db.prepare('UPDATE guild_skills SET essence=?,level=? WHERE guild_id=?').run(completed?0:s.essence+amount,completed?next.level:s.level,m.id);
   db.prepare('INSERT INTO guild_skill_donations VALUES(?,?,?,?)').run(m.id,id,amount,now());message=completed?`Çekirdeğin Birliği ${next.level}. seviye açıldı.`:'Öz bağışın Yeşil Küreye eklendi.';
  }
  const result={ok:true,message};db.prepare('INSERT INTO guild_skill_receipts VALUES(?,?,?,?)').run(id,body.requestId,payload,JSON.stringify(result));db.exec('COMMIT');return result;
 }catch(e){db.exec('ROLLBACK');throw e;}},
 chat(id){const m=member(id);return m?{guildId:m.id,messages:db.prepare('SELECT id,player_id,player_name,body,created_at FROM guild_chat WHERE guild_id=? ORDER BY id DESC LIMIT 40').all(m.id).reverse()}: {guildId:null,messages:[]};},
 send(id,body){const m=member(id);if(!m)throw Error('Lonca sohbeti için bir loncaya katıl.');const name=db.prepare('SELECT name FROM players WHERE id=?').get(id).name;db.prepare('INSERT INTO guild_chat(guild_id,player_id,player_name,body,created_at) VALUES(?,?,?,?,?)').run(m.id,id,name,body,Math.floor(now()/1000));db.prepare('DELETE FROM guild_chat WHERE guild_id=? AND id NOT IN(SELECT id FROM guild_chat WHERE guild_id=? ORDER BY id DESC LIMIT 100)').run(m.id,m.id);return {ok:true};}
 };
}

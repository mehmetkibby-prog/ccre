import {createPendingAdmissionR14} from './pending-admission-r14.mjs';
import {prepareLoadLabAdmissionR12,auditLoadLabPreparationR12} from './auth-preparation-r12.mjs';
import {rewardBatchDiagnosticsR9} from '../reward-batch-r7.mjs';
import {readBuildIdentity477} from '../build-identity-r7.mjs';
const BUILD_IDENTITY477=readBuildIdentity477(new URL('../../../realm-package-manifest.json',import.meta.url),'native');
import {entryAdmissionSnapshot477} from '../entry-admission477.mjs';
import {createLocalControl} from './control-rpc.mjs';
import {fail,validId,sessionDigest,validateConfig} from './protocol.mjs';
import {recoverLoadLabBot} from './recovery.mjs';
import {normalRespawn} from './native-respawn.mjs';
import {ensureLoadLabCleanupSchema} from './cleanup.mjs';
import {createBotCheck} from '../bot-check.mjs';
import {createStarterReward} from '../starter-reward.mjs';

const quote=s=>'"'+s.replaceAll('"','""')+'"';
export function ensureRealmLabSchema(db){
 ensureLoadLabCleanupSchema(db);
 for(const table of ['players','monsters']){
  const cols=new Set(db.prepare('PRAGMA table_info('+table+')').all().map(r=>r.name));
  if(!cols.size)throw Error('loadlab_missing_'+table);
  if(!cols.has('loadlab_run_id'))db.exec("ALTER TABLE "+table+" ADD COLUMN loadlab_run_id TEXT NOT NULL DEFAULT ''");
  db.exec('CREATE INDEX IF NOT EXISTS loadlab_'+table+'_run_v1 ON '+table+'(loadlab_run_id) WHERE loadlab_run_id!=\'\'');
 }
 if(!db.prepare('PRAGMA table_info(players)').all().some(r=>r.name==='loadlab_team'))db.exec('ALTER TABLE players ADD COLUMN loadlab_team INTEGER NOT NULL DEFAULT 0');
 db.exec(`CREATE TABLE IF NOT EXISTS loadlab_entities_v1(kind TEXT NOT NULL,id TEXT PRIMARY KEY NOT NULL,run_id TEXT NOT NULL,account_id TEXT,descriptor_json TEXT NOT NULL); CREATE INDEX IF NOT EXISTS loadlab_entities_run_v1 ON loadlab_entities_v1(run_id); CREATE TABLE IF NOT EXISTS loadlab_sessions_v1(token_hash TEXT PRIMARY KEY NOT NULL,csrf_hash TEXT NOT NULL,account_id TEXT NOT NULL,player_id TEXT NOT NULL,run_id TEXT NOT NULL,expires_ms INTEGER NOT NULL); CREATE INDEX IF NOT EXISTS loadlab_sessions_run_v1 ON loadlab_sessions_v1(run_id);`);
 db.exec(`CREATE TABLE IF NOT EXISTS loadlab_admissions_v1(account_id TEXT PRIMARY KEY NOT NULL,run_id TEXT NOT NULL,username TEXT NOT NULL,created_ms INTEGER NOT NULL); CREATE INDEX IF NOT EXISTS loadlab_admissions_run_v1 ON loadlab_admissions_v1(run_id);`);
 db.exec(`CREATE TABLE IF NOT EXISTS loadlab_boss_rounds_v1(boss_round INTEGER PRIMARY KEY NOT NULL,run_id TEXT NOT NULL,monster_id TEXT NOT NULL); CREATE INDEX IF NOT EXISTS loadlab_boss_rounds_run_v1 ON loadlab_boss_rounds_v1(run_id);`);
}
export function seedRegistryFrame(db,version){
 const tables=new Set(db.prepare("SELECT name FROM sqlite_schema WHERE type='table'").all().map(r=>r.name));
 const runs=new Map();
 if(tables.has('loadlab_entities_v1'))for(const row of db.prepare('SELECT * FROM loadlab_entities_v1').all()){
  let run=runs.get(row.run_id);if(!run)runs.set(row.run_id,run={id:row.run_id,status:'revoked',expiresAtMs:0,heartbeatUntilMs:0,bots:[],monsters:[],monsterProfiles:[],bossRanges:[]});
  if(row.kind==='player'){const d=JSON.parse(row.descriptor_json);run.bots.push({id:row.id,accountId:row.account_id,team:d.team??0,channel:d.channel,area:d.area,instance:d.instance,...(d.admissionScenarioR14?{admissionScenarioR14:d.admissionScenarioR14,kind:d.kind,targetIds:d.targetIds,assignmentRevision:d.admissionR14?.revision??0,visitedChannels:d.admissionR14?.visitedChannels??[d.channel]}:{})});}else if(row.kind==='monster'){
   const d=JSON.parse(row.descriptor_json);run.monsters.push(row.id);
   if(!validId(d.sourceId))throw fail('durable_monster_profile_missing',503);run.monsterProfiles.push({id:row.id,sourceId:d.sourceId});
   if(d.boss){if(!Number.isSafeInteger(d.roundStart)||d.roundStart<2**40||d.roundCount!==1024)throw fail('durable_boss_range_missing',503);run.bossRanges.push({monsterId:row.id,start:d.roundStart,count:d.roundCount});}
  }
 }
 for(const table of ['loadlab_accounts_v1','loadlab_admissions_v1'])if(tables.has(table))for(const row of db.prepare('SELECT * FROM '+table).all()){
  let run=runs.get(row.run_id);if(!run)runs.set(row.run_id,run={id:row.run_id,status:'revoked',expiresAtMs:0,heartbeatUntilMs:0,bots:[],monsters:[]});
  if(!run.bots.some(b=>b.accountId===row.account_id))run.bots.push({id:'unadmitted-'+row.account_id,accountId:row.account_id,team:0});
 }
 if(tables.has('loadlab_cleanup_shared_v1'))for(const row of db.prepare('SELECT * FROM loadlab_cleanup_shared_v1').all()){
  if(!validId(row.run_id)||!['prepared','deleted'].includes(row.status))throw fail('invalid_cleanup_journal',503);
  const ids=JSON.parse(row.ids_json),descriptors=JSON.parse(row.descriptors_json);
  if(!Array.isArray(ids)||ids.length>225||new Set(ids).size!==ids.length||!Array.isArray(descriptors)||ids.length!==descriptors.length)throw fail('invalid_cleanup_journal',503);
  let run=runs.get(row.run_id);if(!run)runs.set(row.run_id,run={id:row.run_id,status:'revoked',expiresAtMs:0,heartbeatUntilMs:0,bots:[],monsters:[],monsterProfiles:[],bossRanges:[]});
  run.monsterProfiles??=[];run.bossRanges??=[];
  for(const d of descriptors){
   if(!validId(d.id)||!ids.includes(d.id)||d.channel!==0||d.boss!==true||!validId(d.sourceId)||!Number.isSafeInteger(d.roundStart)||d.roundStart<2**40||d.roundCount!==1024)throw fail('invalid_cleanup_descriptor',503);
   if(!run.monsters.includes(d.id))run.monsters.push(d.id);
   const p=run.monsterProfiles.find(p=>p.id===d.id);if(p&&p.sourceId!==d.sourceId)throw fail('cleanup_profile_mismatch',503);if(!p)run.monsterProfiles.push({id:d.id,sourceId:d.sourceId});
   const b=run.bossRanges.find(b=>b.monsterId===d.id);if(b&&(b.start!==d.roundStart||b.count!==d.roundCount))throw fail('cleanup_range_mismatch',503);if(!b)run.bossRanges.push({monsterId:d.id,start:d.roundStart,count:d.roundCount});
  }
 }
 return {version,generation:0,enabled:false,windowExpiresAtMs:0,runs:[...runs.values()]};
}
function ownership(db,runId){
 const rows=db.prepare('SELECT * FROM loadlab_entities_v1 WHERE run_id=? ORDER BY kind,id').all(runId);
 for(const r of rows){if(!validId(r.id)||!['player','monster'].includes(r.kind))throw fail('invalid_ownership_marker',409);const actual=db.prepare('SELECT * FROM '+(r.kind==='player'?'players':'monsters')+' WHERE id=?').get(r.id);if(!actual||actual.loadlab_run_id!==runId||(r.kind==='player'&&actual.account_id!==r.account_id))throw fail('ownership_mismatch',409);}
 return rows;
}
export async function startRealmControl({database,native,realm,supervisor,config,applicationConfig,registry,metrics,now=Date.now}){
 if(!config)return {close(){}};
 const sql=database.sqlite;let authorizationReadinessR12=null;
 const reassignPending=createPendingAdmissionR14({database,supervisor,registry,now});
 const occupancy=()=>[1,2,3].map(channel=>Number(database.compiled('SELECT COUNT(*) AS n FROM players WHERE channel=? AND last_seen>=? AND loadlab_run_id=\'\'').get(channel,Math.floor(now()/1000)-30)?.n??0));
 const broadcast=async(frame)=>{
  registry.apply(frame);
  const ready=[...supervisor.children.values()].filter(s=>s.ready);
  if(ready.length!==3)throw fail('channel_unavailable',503);
  const replies=await Promise.all(ready.map(s=>s.rpc.request('loadlabState',frame,{timeoutMs:3000})));
  if(replies.some(r=>r.generation!==frame.generation))throw fail('registry_ack_mismatch',503);
  return {ok:true,generation:frame.generation};
 };
 const handlers={
  inventory(){return seedRegistryFrame(sql,'col-loadlab-v1');},
  profiles(){
   const normals=[1,2,3].map(channel=>{const row=database.compiled("SELECT id FROM monsters WHERE area='forest' AND channel=? AND is_boss=0 AND is_stone=0 AND loadlab_run_id='' AND (id LIKE 'golge-%' OR id LIKE 'curuk-%' OR id LIKE 'yutan-%') ORDER BY id LIMIT 1").get(channel);if(!row)throw fail('normal_profile_missing',503);return {channel,sourceId:row.id};});
   const boss=database.compiled("SELECT id,area,x,y FROM monsters WHERE id='dunya-bosu-1' AND is_boss=1 AND loadlab_run_id=''").get();if(!boss||boss.area!=='sanctum')throw fail('boss_profile_missing',503);
   return {targetSupplyProfile:'r10-clientlike-900-1000-45000-normal-respawn1s-v1',normals,boss:{sourceId:boss.id,area:boss.area,x:1200,y:690}};
  },
  status(){
   const channelProcesses=supervisor.snapshot();
   const bots=database.compiled("SELECT channel,COUNT(*) AS n FROM players WHERE loadlab_run_id!='' AND last_seen>=? GROUP BY channel").all(Math.floor(now()/1000)-30);
   return {authorizationReadiness:authorizationReadinessR12,targetSupplyProfile:'r10-clientlike-900-1000-45000-normal-respawn1s-v1',buildIdentity:BUILD_IDENTITY477,rewardSchemaDiagnostics:rewardBatchDiagnosticsR9(database.sqlite),writerGroups:database.writerGroups477?.snapshot()??null,writerSqlPopulation:database.writerSqlPopulation477?.snapshot()??null,writerRewardPaths:database.writerRewardMetricsR10?.snapshot()??null,entryAdmission:entryAdmissionSnapshot477(),observedAtMs:now(),mainPid:process.pid,startupId:process.env.CORE_APP_STARTUP_ID??String(process.pid),humanPlayers:occupancy(),botPlayers:[1,2,3].map(channel=>Number(bots.find(b=>b.channel===channel)?.n??0)),
    capacity:database.compiled('SELECT channel_capacity FROM game_settings WHERE id=1').get()?.channel_capacity,channelProcesses,durability:database.walSync?.snapshot()??{mode:'full',syncs:null,totalMs:null,meanMs:null,maxMs:null},labSafetyCounters:metrics.snapshot(),
    labFaults:[...registry.faults(),...channelProcesses.channels.flatMap(c=>c.health?.loadlabFaults??[])],runs:database.compiled('SELECT run_id,kind,COUNT(*) AS count FROM loadlab_entities_v1 GROUP BY run_id,kind').all()};
  },
  applyState:broadcast,
  reassignPending,
  async admit({runId,grant,token,csrf,expiresAtMs}){
   if(!validId(runId)||registry.accountRun(grant?.account?.id)!==runId||expiresAtMs<=now()||expiresAtMs>now()+960000)throw fail('unmarked_account',403);
   if(!/^BOT_(?:0[1-9]|[1-6][0-9]|7[0-5])$/.test(grant.account.username)||typeof token!=='string'||typeof csrf!=='string'||token.length<32||csrf.length<32)throw fail('invalid_admission');
   await prepareLoadLabAdmissionR12({registry,realm,grant,runId,expiresAtMs,now});
   await database.atomic(db=>db.prepare('INSERT INTO loadlab_admissions_v1 VALUES(?,?,?,?)').run(grant.account.id,runId,grant.account.username,now()));
   const session=await realm.admission.accept(grant,{sessionToken:token,csrfToken:csrf});
   await database.batch([database.prepare('UPDATE auth_sessions SET expires_at=MIN(expires_at,?) WHERE token_hash=? AND account_id=?').bind(Math.floor(expiresAtMs/1000),sessionDigest(token),grant.account.id)]);
   return {ok:true,expiresAt:Math.min(session.expiresAt,Math.floor(expiresAtMs/1000))};
  },
  async provision({runId,bots,monsters,runConfig,expiresAtMs}){
   if(!validId(runId)||!Array.isArray(bots)||bots.length<1||bots.length>75||!Array.isArray(monsters)||monsters.length>225||expiresAtMs<=now()||expiresAtMs>now()+960000)throw fail('invalid_provision');
   authorizationReadinessR12=null;
   const checked=validateConfig(runConfig,occupancy());
   if(runConfig.targetSupplyProfile!==undefined&&runConfig.targetSupplyProfile!=='r10-clientlike-900-1000-45000-normal-respawn1s-v1'||registry.targetSupplyProfile(runId)!==(runConfig.targetSupplyProfile??null))throw fail('target_supply_profile_mismatch',409);
   if(checked.botCount!==bots.length||database.compiled('SELECT 1 FROM loadlab_entities_v1 LIMIT 1').get())throw fail('provision_or_previous_run_mismatch',409);
   if(database.compiled('SELECT channel_capacity FROM game_settings WHERE id=1').get()?.channel_capacity!==25)throw fail('expected_capacity_25',409);
   const settings={...database.compiled('SELECT * FROM game_settings WHERE id=1').get(),...database.compiled('SELECT * FROM combat_settings WHERE id=1').get()};
   const hpBonus=Math.max(0,Number(settings.enchant_hp_tier_three)||0),maxHp=Number(settings.player_max_hp)+hpBonus*2;
   if(!Number.isFinite(maxHp)||maxHp<1||maxHp>100000)throw fail('invalid_character_settings');
   const monsterCols=sql.prepare('PRAGMA table_info(monsters)').all().map(r=>r.name);
   await database.atomic(db=>{
    const seconds=Math.floor(now()/1000);
    // Use the normal account deadline and offer ledger before the first channel
    // request. This is setup, not a CAPTCHA exemption or an opened reward.
    const botCheck=createBotCheck(db,{now});
    const starter=createStarterReward(db,{now,initialize:false});
    for(const b of bots){
     if(registry.playerRun(b.id)!==runId||registry.accountRun(b.accountId)!==runId||!/^BOT_\d{2}$/.test(b.name)||!['avci','muhafiz','arkanist'].includes(b.role)||![0,1,2].includes(b.team)||![1,2,3].includes(b.channel)||!['forest','war','sanctum'].includes(b.area)||!Number.isFinite(b.x)||!Number.isFinite(b.y)||b.x<0||b.y<0||b.x>6000||b.y>6000)throw fail('invalid_owned_bot');
     if(!db.prepare('SELECT 1 FROM accounts WHERE id=?').get(b.accountId))throw fail('realm_admission_required');
     if(db.prepare('SELECT 1 FROM players WHERE id=? OR account_id=?').get(b.id,b.accountId)||db.prepare('SELECT 1 FROM character_names WHERE normalized_name=?').get(b.name.toLocaleLowerCase('tr-TR')))throw fail('character_collision',409);
     db.prepare('INSERT INTO players(id,account_id,name,role,x,y,hp,max_hp,level,area,channel,last_seen,created_at,potions,loadlab_run_id,loadlab_team) VALUES(?,?,?,?,?,?,?,?,40,?,?,0,?,100,?,?)').run(b.id,b.accountId,b.name,b.role,b.x,b.y,maxHp,maxHp,b.area,b.channel,seconds,runId,b.team);
     db.prepare('INSERT INTO character_names(normalized_name,player_id) VALUES(?,?)').run(b.name.toLocaleLowerCase('tr-TR'),b.id);
     db.prepare('INSERT INTO loadlab_entities_v1 VALUES(\'player\',?,?,?,?)').run(b.id,runId,b.accountId,JSON.stringify({...b,token:undefined,csrf:undefined,hp:maxHp,maxHp,admissionScenarioR14:checked.scenario}));
     db.prepare('INSERT INTO loadlab_sessions_v1 VALUES(?,?,?,?,?,?)').run(sessionDigest(b.token),sessionDigest(b.csrf),b.accountId,b.id,runId,expiresAtMs);
     botCheck.deadline(b.accountId);
     starter.grant(b.accountId,b.id);
     const gear=[['weapon',Number(settings.red_weapon_power_min)||30,[]],['armor',Number(settings.red_armor_power_max)||20,[{kind:'hp',value:hpBonus}]],['necklace',0,[{kind:'hp',value:hpBonus}]]];
     for(const[kind,power,enchantments]of gear)db.prepare("INSERT INTO player_items(id,player_id,kind,item_name,rarity,power,role,equipped,created_at,enchantments) VALUES(?,?,?,?,'red',?,?,1,?,?)").run('labi-'+b.id+'-'+kind,b.id,kind,'Test '+kind,power,b.role,seconds,JSON.stringify(enchantments));
    }
    for(const m of monsters){
     if(registry.monsterRun(m.id)!==runId||!(m.boss?m.channel===0:[1,2,3].includes(m.channel))||!Number.isFinite(m.x)||!Number.isFinite(m.y)||m.x<0||m.y<0||m.x>6000||m.y>6000||m.area!==(m.boss?'sanctum':'forest'))throw fail('invalid_owned_monster');
     const source=m.boss?db.prepare("SELECT * FROM monsters WHERE id='dunya-bosu-1' AND loadlab_run_id=''").get():db.prepare("SELECT * FROM monsters WHERE id=? AND area='forest' AND channel=? AND is_boss=0 AND is_stone=0 AND loadlab_run_id='' ").get(m.sourceId,m.channel);
     if(!source)throw fail('monster_profile_missing',409);
     if(!m.boss&&(!/^(golge|curuk|yutan)-/.test(source.id)||!m.id.startsWith(source.id.split('-')[0]+'-loadlab-')))throw fail('monster_profile_identity_mismatch');
     const row={...source,id:m.id,name:m.boss?'Test Bossu':'Test '+source.name,channel:m.channel,area:m.area,x:m.x,y:m.y,hp:source.max_hp,loadlab_run_id:runId};
     for(const key of ['is_stone','summoned','respawn_at','respawn_at_ms','last_attack_at','attack_at_ms'])if(key in row)row[key]=0;
     if(m.boss){
      if(!Number.isSafeInteger(m.roundStart)||m.roundStart<2**40||m.roundCount!==1024||!Number.isSafeInteger(m.roundStart+m.roundCount))throw fail('invalid_boss_round_range');
      const end=m.roundStart+m.roundCount-1;
      for(const[table,column]of [['monsters','spawn_round'],['boss_participants','boss_round'],['boss_defeats','boss_round'],['boss_reward_claims','boss_round'],['loadlab_boss_rounds_v1','boss_round']])if(db.prepare('SELECT 1 FROM '+table+' WHERE '+column+' BETWEEN ? AND ? LIMIT 1').get(m.roundStart,end))throw fail('boss_round_collision',409);
      const insert=db.prepare('INSERT INTO loadlab_boss_rounds_v1 VALUES(?,?,?)');for(let round=m.roundStart;round<=end;round++)insert.run(round,runId,m.id);
      row.spawn_round=m.roundStart;
     }else if('spawn_round' in row)row.spawn_round=1;
     db.prepare('INSERT INTO monsters('+monsterCols.map(quote).join(',')+') VALUES('+monsterCols.map(()=>'?').join(',')+')').run(...monsterCols.map(c=>row[c]??null));
     db.prepare('INSERT INTO loadlab_entities_v1 VALUES(\'monster\',?,?,NULL,?)').run(m.id,runId,JSON.stringify(m));
    }
   });
   authorizationReadinessR12=auditLoadLabPreparationR12({database,registry,runId,bots,expiresAtMs,now});
   // New participants are still offline. The existing join/heartbeat capacity
   // guard, not this provisioning transaction, admits each ramped bot.
   await broadcast(registry.snapshot());
   if(monsters.some(m=>m.boss&&m.channel===0)){
    const owner=supervisor.children.get(1);if(!owner?.ready)throw fail('shared_owner_unavailable',503);
    await owner.rpc.request('loadlabSharedSynchronize',{runId},{timeoutMs:15000});
   }
   const skillTwoCooldownMs=Number(settings.skill_two_cooldown_ms),skillThreeCooldownMs=Number(settings.skill_three_cooldown_ms);
   if(![skillTwoCooldownMs,skillThreeCooldownMs].every(n=>Number.isSafeInteger(n)&&n>=500&&n<=60000))throw fail('invalid_combat_cooldowns');
   return {authorizationReadiness:authorizationReadinessR12,targetSupplyProfile:registry.targetSupplyProfile(runId),created:bots.length,monsters:monsters.length,maxHp,cycle:Number(sql.prepare('SELECT cycle FROM world_state WHERE id=1').get()?.cycle),settings:{skillTwoCooldownMs,skillThreeCooldownMs}};
  },
  sessions({runId}){return database.compiled('SELECT * FROM loadlab_sessions_v1 WHERE run_id=?').all(runId);},
  async recover({runId,playerId,reason,credentials}){
   if(!validId(runId)||!validId(playerId)||registry.playerRun(playerId)!==runId||!registry.active(runId))throw fail('inactive_owned_bot',403);
   return recoverLoadLabBot({database,supervisor,registry,runId,playerId,reason:String(reason??'').slice(0,80),now,nativeRespawn:normalRespawn({database,registry,config,applicationConfig,realm,runId,playerId,credentials,now})});
  },
  async revoke({runId}){
   const rows=ownership(sql,runId),players=rows.filter(r=>r.kind==='player');
   if(registry.active(runId))throw fail('revoke_registry_first',409);
   await broadcast(registry.snapshot());
   await Promise.all([...supervisor.children.values()].filter(s=>s.ready).map(s=>s.rpc.request('loadlabDrain',{runId,ids:players.filter(r=>JSON.parse(r.descriptor_json).channel===s.channel).map(r=>r.id)},{timeoutMs:15000})));
   await database.atomic(db=>{for(const p of players){db.prepare('DELETE FROM game_presence WHERE account_id=?').run(p.account_id);db.prepare('DELETE FROM auth_sessions WHERE account_id=?').run(p.account_id);db.prepare('UPDATE players SET last_seen=0 WHERE id=? AND loadlab_run_id=?').run(p.id,runId);}db.prepare('DELETE FROM loadlab_sessions_v1 WHERE run_id=?').run(runId);});
   return {revoked:players.length,drained:true};
  },
  async cleanup({runId}){
   if(registry.active(runId))throw fail('revoke_before_cleanup',409);
   const rows=ownership(sql,runId);
   // Cleanup implementation is deliberately supplied by the reviewed schema
   // owner. Never fall back to name/prefix deletes or disabling foreign keys.
   if(typeof globalThis.__colLoadLabCleanup!=='function')throw fail('reviewed_cleanup_unavailable',503);
   return globalThis.__colLoadLabCleanup({database,supervisor,registry,runId,rows});
  },
 };
 return createLocalControl({port:config.gamePort,key:config.controlKey,handlers});
}

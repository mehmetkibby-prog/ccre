import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {performance} from 'node:perf_hooks';
import {createCombatCheckpointHandler as candidate} from '../working/core511-source/scripts/core511/combat-checkpoint.mjs';
import {createCombatCheckpointHandler as baseline} from '../../r106_captcha_worker/working/core511-source/scripts/core511/combat-checkpoint.mjs';
import {installPreparedStatements477,withPreparedStatements477} from '../working/native510-bb3a6cc689c6/vds-server/src/prepared-statements477.mjs';
import {installPreparedStatements477 as installBaseline,withPreparedStatements477 as withBaseline} from '../../r106_captcha_worker/working/native510-bb3a6cc689c6/vds-server/src/prepared-statements477.mjs';

const bossQuery='SELECT 1 FROM monsters WHERE spawn_round=? AND is_boss=1 AND hp>0';
const playerQuery='SELECT 1 FROM players WHERE id=?';
const playersQuery='SELECT p.id FROM json_each(?) wanted JOIN players p ON p.id=wanted.value';
const wire=x=>JSON.parse(JSON.stringify(x));

function scene(create,{background=6000,players=40,rounds=[7]}={}){
 const db=new DatabaseSync(':memory:');
 db.exec(`CREATE TABLE players(id TEXT PRIMARY KEY);
 CREATE TABLE monsters(id TEXT PRIMARY KEY,area TEXT,channel INTEGER,spawn_round INTEGER,is_boss INTEGER,is_stone INTEGER,max_hp INTEGER,hp INTEGER,last_damaged_at_ms INTEGER,last_regen_at_ms INTEGER,root_until_ms INTEGER,stun_until_ms INTEGER,control_x INTEGER,control_y INTEGER,wave_stage INTEGER);
 CREATE TABLE monster_participants(monster_id TEXT,spawn_round INTEGER,player_id TEXT,created_at INTEGER,stone_damage476 INTEGER,stone_first_hit_at_ms476 INTEGER,PRIMARY KEY(monster_id,spawn_round,player_id));
 CREATE TABLE boss_participants(boss_round INTEGER,player_id TEXT,hit_count INTEGER,total_damage INTEGER,created_at INTEGER,PRIMARY KEY(boss_round,player_id));
 CREATE TABLE combat_events(id INTEGER PRIMARY KEY,player_id TEXT,target_id TEXT,role TEXT,ability INTEGER,created_at INTEGER);`);
 db.exec('BEGIN');
 const insert=db.prepare('INSERT INTO monsters VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)');
 for(let i=0;i<background;i++)insert.run('background-'+i,'forest',i%4+1,1,0,0,100,100,0,0,0,0,0,0,0);
 for(const round of rounds)insert.run('boss-'+round,'sanctum',0,round,1,0,100000,100000,0,0,0,0,0,0,0);
 const addPlayer=db.prepare('INSERT INTO players VALUES(?)');for(let i=0;i<players;i++)addPlayer.run('player-'+i);
 db.exec('COMMIT');
 const counts=new Map(),prepare=db.prepare;
 db.prepare=function(query,...args){const statement=Reflect.apply(prepare,this,[query,...args]);for(const method of ['get','all','run']){const invoke=statement[method];statement[method]=function(...bindings){counts.set(query,(counts.get(query)??0)+1);return Reflect.apply(invoke,this,bindings);};}return statement;};
 const install=create===baseline?installBaseline:installPreparedStatements477,withPrepared=create===baseline?withBaseline:withPreparedStatements477;install(db);
 const handler=create({assertResources:()=>true});
 const payload={monsters:[],participants:[],bossParticipants:[],combatEvents:[]};
 for(const round of rounds){
  const base=wire(db.prepare('SELECT * FROM monsters WHERE id=?').get('boss-'+round));
  payload.monsters.push({base,current:{...base,hp:99900,last_damaged_at_ms:100}});
  for(let i=0;i<players;i++){
   payload.participants.push({base:null,current:{monster_id:'boss-'+round,spawn_round:round,player_id:'player-'+i,created_at:100,stone_damage476:0,stone_first_hit_at_ms476:0}});
   payload.bossParticipants.push({base:null,current:{boss_round:round,player_id:'player-'+i,hit_count:1,total_damage:10,created_at:100}});
   payload.combatEvents.push({player_id:'player-'+i,target_id:'boss-'+round,role:'avci',ability:0,created_at:100});
  }
 }
 const snapshot=()=>wire(Object.fromEntries(['monsters','monster_participants','boss_participants','combat_events'].map(table=>[table,db.prepare('SELECT * FROM '+table+' ORDER BY rowid').all()])));
 const run=(input=payload,{commit=true}={})=>{
  counts.clear();db.exec('BEGIN IMMEDIATE');
  try{const started=performance.now(),value=withPrepared(db,()=>handler(db,input,{actor:'player-0'})),ms=performance.now()-started;db.exec(commit?'COMMIT':'ROLLBACK');return {value,ms,counts:new Map(counts)};}
  catch(error){if(db.isTransaction)db.exec('ROLLBACK');throw error;}
 };
 return {db,counts,payload,run,snapshot};
}

test('40 boss contributors / 6000 background monsters retain exact committed rows with one live-round query',t=>{
 const old=scene(baseline),next=scene(candidate);t.after(()=>{old.db.close();next.db.close();});
 const a=old.run(),b=next.run();assert.deepEqual(b.value,a.value);assert.deepEqual(next.snapshot(),old.snapshot());
 assert.equal(a.counts.get(bossQuery),40);assert.equal(b.counts.get(bossQuery),1);
 assert.equal(a.counts.get(playerQuery),40);assert.equal(b.counts.get(playerQuery)??0,0);
 assert.equal(b.counts.get(playersQuery),1);
 t.diagnostic(JSON.stringify({backgroundMonsters:6000,contributors:40,baselineBossReads:a.counts.get(bossQuery),candidateBossReads:b.counts.get(bossQuery),baselinePlayerReads:a.counts.get(playerQuery),candidatePlayerReads:b.counts.get(playerQuery)??0,scope:'one synchronous checkpoint invocation; native mutation/receipt wrappers tested separately'}));
});

test('distinct boss rounds retain independent guards and invocation-local results',t=>{
 const old=scene(baseline,{background:10,players:3,rounds:[7,8]}),next=scene(candidate,{background:10,players:3,rounds:[7,8]});t.after(()=>{old.db.close();next.db.close();});
 assert.equal(next.run(undefined,{commit:false}).counts.get(bossQuery),2);
 assert.equal(old.run(undefined,{commit:false}).counts.get(bossQuery),6);
 for(const s of [old,next])s.db.prepare('UPDATE monsters SET hp=0 WHERE id=?').run('boss-8');
 for(const s of [old,next]){
  const input=structuredClone(s.payload);input.monsters=[];input.participants=[];
  const before=s.snapshot();assert.throws(()=>s.run(input),{code:'combat_boss_participant_missing'});assert.deepEqual(s.snapshot(),before,'every queued write is rolled back on a later invalid round');
 }
});

test('missing players, dead rounds, stale bases and invalid events preserve rejection and rollback',t=>{
 for(const type of ['missing-player','missing-round','stale-base','bad-event']){
  const old=scene(baseline,{background:10,players:3}),next=scene(candidate,{background:10,players:3});t.after(()=>{old.db.close();next.db.close();});
  const errors=[];
  for(const s of [old,next]){
   const input=structuredClone(s.payload);
   if(type==='missing-player')input.bossParticipants.at(-1).current.player_id='absent';
   if(type==='missing-round')input.bossParticipants.at(-1).current.boss_round=999;
   if(type==='stale-base')input.monsters[0].base.hp=99999;
   if(type==='bad-event')input.combatEvents.at(-1).role='invalid';
   const before=s.snapshot();let rejection;try{s.run(input);}catch(error){rejection=error;}assert(rejection,type);errors.push(rejection.code);assert.deepEqual(s.snapshot(),before,type+' must roll back');
  }
  assert.equal(errors[1],errors[0],type+' must keep native rejection');
 }
});

test('unknown main or temp trigger fallback rereads a live boss after every inserted contribution',t=>{
 for(const temporary of ['', 'TEMP']){
 const old=scene(baseline,{background:10,players:3}),next=scene(candidate,{background:10,players:3});t.after(()=>{old.db.close();next.db.close();});
 for(const s of [old,next]){
  s.db.exec("CREATE "+temporary+" TRIGGER expire_boss AFTER INSERT ON boss_participants WHEN NEW.player_id='player-0' BEGIN UPDATE monsters SET hp=0 WHERE spawn_round=NEW.boss_round AND is_boss=1; END");
  const before=s.snapshot();assert.throws(()=>s.run(),{code:'combat_boss_participant_missing'});
  assert.equal(s.counts.get(bossQuery),2,'second row must observe trigger-killed boss');assert.deepEqual(s.snapshot(),before,'fallback writes and trigger side effects roll back together');
 }}
});

test('missing player after a prior invocation and duplicate contributor keys keep the original rejection',t=>{
 for(const kind of ['player-deleted','duplicate-key']){
  const old=scene(baseline,{background:10,players:3}),next=scene(candidate,{background:10,players:3});t.after(()=>{old.db.close();next.db.close();});const errors=[];
  for(const s of [old,next]){
   s.run(undefined,{commit:false});const input=structuredClone(s.payload);
   if(kind==='player-deleted'){s.db.exec("DELETE FROM players WHERE id='player-2'");input.participants=[];}
   else input.bossParticipants.push(structuredClone(input.bossParticipants[0]));
   const before=s.snapshot();let rejection;try{s.run(input);}catch(error){rejection=error;}assert(rejection,kind);errors.push(rejection.code);assert.deepEqual(s.snapshot(),before);
  }
  assert.equal(errors[1],errors[0]);assert.equal(errors[1],kind==='player-deleted'?'combat_boss_participant_missing':'combat_checkpoint_conflict');
 }
});

test('unknown trigger fallback rereads player existence and keeps row/event ordering',t=>{
 const old=scene(baseline,{background:10,players:3}),next=scene(candidate,{background:10,players:3});t.after(()=>{old.db.close();next.db.close();});
 for(const s of [old,next]){
  s.db.exec("CREATE TRIGGER remove_next_player AFTER INSERT ON boss_participants WHEN NEW.player_id='player-0' BEGIN DELETE FROM players WHERE id='player-1'; END");
  const before=s.snapshot();assert.throws(()=>s.run(),{code:'combat_boss_participant_missing'});assert.equal(s.counts.get(bossQuery),2);assert.equal(s.counts.get(playerQuery),5);assert.deepEqual(s.snapshot(),before);assert(s.db.prepare("SELECT 1 FROM players WHERE id='player-1'").get());
  s.db.exec('DROP TRIGGER remove_next_player');
  const log='CREATE TABLE ordered_log(step INTEGER PRIMARY KEY,kind TEXT,id TEXT); CREATE TRIGGER log_participant AFTER INSERT ON monster_participants BEGIN INSERT INTO ordered_log(kind,id) VALUES(\'participant\',NEW.player_id); END; CREATE TRIGGER log_boss AFTER INSERT ON boss_participants BEGIN INSERT INTO ordered_log(kind,id) VALUES(\'boss\',NEW.player_id); END; CREATE TRIGGER log_event AFTER INSERT ON combat_events BEGIN INSERT INTO ordered_log(kind,id) VALUES(\'event\',NEW.player_id); END';
  s.db.exec(log);s.run();
 }
 assert.deepEqual(next.snapshot(),old.snapshot());assert.deepEqual(wire(next.db.prepare('SELECT * FROM ordered_log').all()),wire(old.db.prepare('SELECT * FROM ordered_log').all()));
});

test('checkpoint component timing retains all samples and does not assert whole-game latency',t=>{
 const old=scene(baseline),next=scene(candidate);t.after(()=>{old.db.close();next.db.close();});
 for(let i=0;i<3;i++){old.run(undefined,{commit:false});next.run(undefined,{commit:false});}
 const samples={baseline:[],candidate:[]};
 for(let i=0;i<15;i++){samples.baseline.push(old.run(undefined,{commit:false}).ms);samples.candidate.push(next.run(undefined,{commit:false}).ms);}
 const stats=values=>{const sorted=[...values].sort((a,b)=>a-b);return {medianMs:sorted[Math.floor(sorted.length/2)],maxMs:Math.max(...values),samplesMs:values};};
 t.diagnostic(JSON.stringify({scope:'in-memory SQLite checkpoint component, 6000 background monsters, 40 contributors, 15 paired runs; not gameplay/network latency',baseline:stats(samples.baseline),candidate:stats(samples.candidate)}));
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {abandonedActors as baseline} from '../r79-audit/core511-source/scripts/core511/abandoned-normal.mjs';
import {abandonedActors as changed,runAbandonedNormal} from '../r81-work/core511-source/scripts/core511/abandoned-normal.mjs';
import {withPreparedStatements477,preparedStatementsStats477} from '../r81-work/native510-bb3a6cc689c6/vds-server/src/prepared-statements477.mjs';
import {fixture,pair,heavyFixture,NOW_MS,TARGET} from './abandoned-r81-fixture.mjs';

function same(f,target=TARGET,nowMs=NOW_MS) {
 const expected=baseline(f.db,target,nowMs),actual=changed(f.db,target,nowMs);
 assert.deepEqual(actual,expected);
 return actual;
}
function use(t,f){t.after(()=>f.db.close());return f;}

test('same unpaid loot owners and eligible XP allies, with a wide player schema',t=>{
 const f=use(t,pair({extraColumns:200,payloadBytes:256}));
 assert.deepEqual(same(f),['ally','owner']);
 f.addPlayer('unrelated');f.addPlayer('paid');f.participant('paid');f.claim('normal','paid');
 assert.deepEqual(same(f),['ally','owner']);
 f.claim('normal','owner');assert.deepEqual(same(f),[]);
});

test('XP, sinsi, boss and loadlab historical claims retain their exact eligibility rules',t=>{
 for(const kind of ['xp','sinsi','boss']) {
  const f=use(t,pair());f.claim(kind,'owner');
  assert.deepEqual(same(f),kind==='boss'?['ally','owner']:['owner']);
 }
 for(const kind of ['world','loadlab','unrelated-loadlab']) {
  const f=use(t,fixture()),target={id:kind==='world'?'dunya-bosu-1':'loadlab-monster',spawnRound:17};
  f.addPlayer('owner');f.addPlayer('ally');f.participant('owner',target);f.party('owner');f.party('ally');f.claim('boss','owner',target);
  if(kind!=='world')f.db.prepare('INSERT INTO loadlab_boss_rounds_v1 VALUES(?,?)').run(17,kind==='loadlab'?target.id:'different-monster');
  assert.deepEqual(same(f,target),kind==='unrelated-loadlab'?['ally','owner']:['owner']);
 }
});

test('death, location, channel, arena and exact distance boundaries are unchanged',t=>{
 const cases=[
  ['hp',0],['hp',null],['area','other'],['channel',2],['arena_match_id','arena-x'],['x',2401],['last_seen',Math.floor(NOW_MS/1000)-31],
 ];
 for(const [field,value] of cases){
  const f=use(t,pair());f.db.prepare(`UPDATE players SET ${field}=? WHERE id='ally'`).run(value);
  assert.deepEqual(same(f),['owner']);
 }
 const f=use(t,pair());f.db.prepare("UPDATE players SET x=2400,last_seen=? WHERE id='ally'").run(Math.floor(NOW_MS/1000)-30);
 assert.deepEqual(same(f),['ally','owner']);
 f.db.exec("UPDATE players SET y=1 WHERE id='ally'");assert.deepEqual(same(f),['owner']);
 f.db.exec("UPDATE players SET x=0,y=0,hp=0 WHERE id='owner'");assert.deepEqual(same(f),['owner']);
});

test('each recency source and a changing current time are read freshly',t=>{
 for(const field of ['last_seen','movement_checked_at_ms','last_monster_hit_at']){
  const f=use(t,pair());
  f.db.exec('UPDATE players SET last_seen=0,movement_checked_at_ms=0,last_monster_hit_at=0');
  f.db.prepare(`UPDATE players SET ${field}=?`).run(field==='last_seen'?Math.floor(NOW_MS/1000)-30:NOW_MS-30_000);
  assert.deepEqual(same(f),['ally','owner']);
  assert.deepEqual(same(f,TARGET,NOW_MS+1000),['owner']);
 }
});

test('target identity, spawn round, sorted deduplication and overlapping parties are preserved',t=>{
 const f=use(t,pair());
 f.addPlayer('other-owner');f.participant('other-owner');f.party('other-owner');
 f.addPlayer('old-round');f.participant('old-round',{...TARGET,spawnRound:16});
 f.addPlayer('other-monster');f.participant('other-monster',{...TARGET,id:'other-monster'});
 assert.deepEqual(same(f),['ally','other-owner','owner']);
 f.claim('normal','owner');assert.deepEqual(same(f),['ally','other-owner','owner']);
 assert.deepEqual(same(f,{...TARGET,spawnRound:16}),['old-round']);
 assert.deepEqual(same(f,{id:'absent',spawnRound:17}),[]);
});

test('compiled statements are reused outside the writer scope without retaining row results',t=>{
 const f=use(t,pair());let compiled=0;const prepare=f.db.prepare;
 f.db.prepare=function(sql,...rest){if(String(sql).startsWith('WITH life('))compiled++;return Reflect.apply(prepare,this,[sql,...rest]);};
 for(let n=0;n<20;n++)assert.deepEqual(changed(f.db,TARGET,NOW_MS),['ally','owner']);
 assert.equal(compiled,1);
 const before=preparedStatementsStats477(f.db);assert(before.hits>=19);
 f.db.exec("DELETE FROM party_members WHERE player_id='ally'");assert.deepEqual(changed(f.db,TARGET,NOW_MS),['owner']);
 f.party('ally');f.db.exec("UPDATE players SET hp=0 WHERE id='ally'");assert.deepEqual(changed(f.db,TARGET,NOW_MS),['owner']);
 f.db.exec("UPDATE players SET hp=100 WHERE id='ally'");assert.deepEqual(changed(f.db,TARGET,NOW_MS),['ally','owner']);
 f.claim('normal','owner');assert.deepEqual(changed(f.db,TARGET,NOW_MS),[]);
 assert.equal(compiled,1);
});

test('synchronous nesting leaves the outer writer transaction and current rows authoritative',t=>{
 const f=use(t,pair());
 f.db.exec('BEGIN IMMEDIATE');
 try {
  withPreparedStatements477(f.db,()=>{
   assert.deepEqual(changed(f.db,TARGET,NOW_MS),['ally','owner']);
   f.claim('normal','owner');assert.deepEqual(changed(f.db,TARGET,NOW_MS),[]);
   assert.equal(f.db.isTransaction,true);
  });
 } finally {f.db.exec('ROLLBACK');}
 assert.deepEqual(changed(f.db,TARGET,NOW_MS),['ally','owner']);
});

test('main/TEMP schema changes, rollback and external schema changes invalidate safely',t=>{
 const dir=mkdtempSync(join(tmpdir(),'col-abandoned-r81-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));
 const file=join(dir,'test.sqlite'),f=use(t,pair({path:file}));
 assert.deepEqual(same(f),['ally','owner']);
 const statsBefore=preparedStatementsStats477(f.db);
 f.db.exec("ALTER TABLE players ADD COLUMN new_payload TEXT DEFAULT 'new'");
 assert.deepEqual(same(f),['ally','owner']);
 f.db.exec("CREATE TEMP TABLE players AS SELECT * FROM main.players; UPDATE temp.players SET hp=0 WHERE id='ally'");
 assert.deepEqual(same(f),['owner']);
 f.db.exec('DROP TABLE temp.players');assert.deepEqual(same(f),['ally','owner']);
 f.db.exec("BEGIN;CREATE TEMP TABLE players AS SELECT * FROM main.players;UPDATE temp.players SET hp=0 WHERE id='ally'");
 assert.deepEqual(same(f),['owner']);f.db.exec('ROLLBACK');assert.deepEqual(same(f),['ally','owner']);
 const other=new DatabaseSync(file);
 try{other.exec('ALTER TABLE players ADD COLUMN external_payload INTEGER DEFAULT 7');}finally{other.close();}
 assert.deepEqual(same(f),['ally','owner']);
 assert(preparedStatementsStats477(f.db).invalidations>statsBefore.invalidations);
});

test('SQL failure unwinds the scope and later calls still use current schema and rows',t=>{
 const f=use(t,pair());assert.deepEqual(changed(f.db,TARGET,NOW_MS),['ally','owner']);
 f.db.exec('ALTER TABLE players RENAME TO unavailable_players');
 assert.throws(()=>changed(f.db,TARGET,NOW_MS));
 f.db.exec('ALTER TABLE unavailable_players RENAME TO players');
 assert.deepEqual(changed(f.db,TARGET,NOW_MS),['ally','owner']);
});

test('real writer-side roster recheck rejects a changed roster before any reward service',t=>{
 const f=use(t,pair()),actors=changed(f.db,TARGET,NOW_MS);
 let checks=0,services=0;
 const writer={abandonedNormal:{assertHeld(){checks++;return true;}},services:{run(){services++;throw Error('reward service must not run');}}};
 f.db.exec("UPDATE players SET hp=0 WHERE id='ally'");
 const result=runAbandonedNormal(writer,f.db,{target:TARGET,actors,nowMs:NOW_MS},{peer:{channel:0,role:'world'}});
 assert.deepEqual(result,{deferred:true});assert.equal(checks,1);assert.equal(services,0);
});

test('600 players and historical claims keep identical actors with a target-scoped materialized source relation',t=>{
 const f=use(t,heavyFixture());let sqlText=null;const prepare=f.db.prepare;
 f.db.prepare=function(sql,...rest){if(String(sql).startsWith('WITH life(')&&sql.includes('sources AS MATERIALIZED'))sqlText=sql;return Reflect.apply(prepare,this,[sql,...rest]);};
 assert.deepEqual(changed(f.db,TARGET,NOW_MS),baseline(f.db,TARGET,NOW_MS));
 assert.equal(changed(f.db,TARGET,NOW_MS).length,20);
 assert(sqlText);
 const plan=f.db.prepare('EXPLAIN QUERY PLAN '+sqlText).all(TARGET.id,TARGET.spawnRound,Math.floor(NOW_MS/1000)-30).map(r=>r.detail);
 assert(plan.some(detail=>detail==='MATERIALIZE sources'));
 assert(plan.some(detail=>detail.includes('monster_participants')&&detail.includes('monster_id=? AND spawn_round=?')));
 f.db.exec("UPDATE players SET hp=0 WHERE id='p17'");
 assert.deepEqual(changed(f.db,TARGET,NOW_MS),baseline(f.db,TARGET,NOW_MS));
 assert(!changed(f.db,TARGET,NOW_MS).includes('p17'));
});

test('seeded mixed histories match the original SQL across 120 adversarial fixtures',t=>{
 let state=0x13579bdf;
 const rand=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/2**32;};
 const choose=a=>a[Math.floor(rand()*a.length)];
 for(let k=0;k<120;k++){
  const f=fixture({extraColumns:k%4===0?80:0});
  try {
   const target={id:choose(['ordinary-monster','dunya-bosu-1','lab-monster']),spawnRound:17};
   if(rand()<0.5)f.db.prepare('INSERT INTO loadlab_boss_rounds_v1 VALUES(?,?)').run(17,choose([target.id,'other-lab']));
   for(let i=0;i<12;i++){
    const id='p'+String(i).padStart(2,'0');
    f.addPlayer(id,{hp:choose([0,1,100,null]),last_seen:Math.floor(NOW_MS/1000)-choose([0,29,30,31,100]),movement_checked_at_ms:choose([0,NOW_MS-31_000,NOW_MS]),last_monster_hit_at:choose([0,NOW_MS-30_000,NOW_MS]),area:choose(['forest','forest','other',null]),channel:choose([1,1,2]),arena_match_id:choose(['','','a',null]),x:choose([0,1,2400,2401,-2400]),y:choose([0,0,1])});
    if(rand()<0.7)f.participant(id,target);
    if(rand()<0.8)f.party(id,choose(['a','b','c']));
    for(const kind of ['normal','xp','sinsi','boss'])if(rand()<0.25)f.claim(kind,id,target);
   }
   same(f,target,NOW_MS+choose([0,1000,30_000]));
  } finally {f.db.close();}
 }
});

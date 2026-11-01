import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {DatabaseSync} from 'node:sqlite';
import {parse} from '../../perf-r11/tests/parser.mjs';
import {BASE,manifest,hash,seeded,temporary} from './helpers.mjs';
import {ResidentState} from '../resident-state.mjs';
import {MovementMemory} from '../movement-memory.mjs';
import {createRules} from '../generated/rules.mjs';
import {createMovementRule} from '../generated/movement.mjs';
const file='dist-vds/server/channel-runtime/index.mjs',source=fs.readFileSync(path.join(BASE,file),'utf8');assert.equal(hash(source),manifest.files.find(row=>row.path===file).sha256);
const ast=parse(source,{ecmaVersion:'latest',sourceType:'module'}),functions=['applyAuthoritativeMove','readAuthoritativeMovement'];
const original=ast.body.filter(n=>n.type==='FunctionDeclaration'&&functions.includes(n.id.name)).map(n=>source.slice(n.start,n.end)).join('\n');
const json=value=>JSON.parse(JSON.stringify(value));
test('movement storage adapter matches original V510 SQL function over 300 seeded cases',async t=>{
 const sqlite=new DatabaseSync(path.join(temporary(t),'movement.sqlite'));t.after(()=>sqlite.close());
 sqlite.exec(`CREATE TABLE players(id TEXT PRIMARY KEY,account_id TEXT,role TEXT,x REAL,y REAL,hp INTEGER,hp_revision INTEGER,area TEXT,channel INTEGER,arena_match_id TEXT,movement_checked_at_ms INTEGER,movement_debt_ms INTEGER,position_revision INTEGER,root_until_ms INTEGER,realtime_scope_version INTEGER,motion_stream_id TEXT,motion_sequence INTEGER,last_seen INTEGER);
 CREATE TABLE world_state(id INTEGER PRIMARY KEY,cycle INTEGER,reset_at INTEGER);INSERT INTO world_state VALUES(1,1,0);
 CREATE TABLE fishing_sessions(player_id TEXT PRIMARY KEY,expires_at_ms INTEGER);
 CREATE TABLE pve_engagements(player_id TEXT,next_hit_at_ms INTEGER);`);
 const database={prepare(sql){const statement=sqlite.prepare(sql);return {bind(...args){return {first:async()=>statement.get(...args)??null};}};}};
 const rules=createRules(),context=vm.createContext({...rules,recordSecurityEvent:()=>{}});vm.runInContext(original,context);
 const optimized=createMovementRule(rules),random=seeded(902),session={player:{id:'p'},account:{id:'a'}},now=100000;
 let accepted=0,rejected=0;
 for(let i=0;i<300;i++){
  const row={id:'p',account_id:'a',role:['muhafiz','avci','arkanist'][i%3],x:2700,y:2025,hp:100,hp_revision:1,area:'forest',channel:1,arena_match_id:'',movement_checked_at_ms:now-200,movement_debt_ms:0,position_revision:1,root_until_ms:0,realtime_scope_version:1,motion_stream_id:'',motion_sequence:0,last_seen:99};
  const payload={x:row.x+Math.round((random()-.5)*200),y:row.y+Math.round((random()-.5)*150),area:'forest',basePositionRevision:1,motionStreamId:'12345678-12345678',motionSequence:1};
  const world={cycle:1,reset_at:0},fishing=new Map(),scope={scopeVersion:1,cycle:1,channel:1,area:'forest',arenaMatchId:''};
  switch(i%15){case 0:row.hp=0;break;case 1:row.root_until_ms=now+1;break;case 2:payload.basePositionRevision=0;break;case 3:payload.area='frozen';break;case 4:payload.path=[[payload.x-1,payload.y]];break;case 5:payload.x+=1200;break;case 6:row.movement_debt_ms=2000;break;case 7:scope.scopeVersion=2;break;case 8:world.reset_at=now/1000+1;break;case 9:fishing.set('p',{expires_at_ms:now});break;case 10:payload.x=Infinity;break;case 11:payload.area='invalid';break;case 12:payload.motionSequence=-1;break;case 13:payload.path=[[row.x,row.y],[payload.x,payload.y]];break;}
  sqlite.exec('DELETE FROM players;DELETE FROM fishing_sessions;DELETE FROM pve_engagements');sqlite.prepare('UPDATE world_state SET cycle=?,reset_at=?').run(world.cycle,world.reset_at);
  sqlite.prepare('INSERT INTO players('+Object.keys(row).join(',')+') VALUES('+Object.keys(row).map(()=>'?').join(',')+')').run(...Object.values(row));
  if(fishing.has('p'))sqlite.prepare('INSERT INTO fishing_sessions VALUES(?,?)').run('p',now);
  const state=new ResidentState(1);state.put('players',{...row,cycle:world.cycle});state.claim('p',1);
  const memory=new MovementMemory({state,world,fishing,pveHitDue:()=>false,epoch:()=>1});
  const expected=await context.applyAuthoritativeMove(null,session,database,payload,now,undefined,scope);
  const actual=optimized(null,session,memory,payload,now,undefined,scope);
  assert(!actual?.then,'new movement must be synchronous');assert.deepEqual(json(actual),json(expected),'case '+i);
  const persisted=sqlite.prepare('SELECT * FROM players').get();for(const field of Object.keys(row))assert.equal(state.read('players','p')[field],persisted[field],'case '+i+' '+field);
  expected.ok?accepted++:rejected++;
 }
 assert(accepted>10&&rejected>200,{accepted,rejected});
});

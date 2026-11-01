import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {randomUUID} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {nativeHttpHost} from './native-http-host-fixture.mjs';
import {until,native} from './helpers.mjs';
import {TOWER_DEFAULTS,createTowerSchema} from '../tower-config.mjs';
import {AggroMemory} from '../aggro-memory.mjs';
import {RetaliationMemory} from '../retaliation-memory.mjs';
import {createRetaliationRules} from '../generated/retaliation-rules.mjs';
import {nativeAtomicStatements} from '../retaliation-writer.mjs';
import {notificationViews} from '../notification-audience.mjs';
import {mapArea} from '../adventure-maps.mjs';
const {installRegistry}=await native('vds-server/src/loadlab/registry.mjs');

test('adventure profile aggro range is not clipped by the normal map spatial candidate radius',()=>{
 installRegistry();
 const area=mapArea('tower','a'.repeat(32),10),now=Date.now(),v=new AggroMemory({channel:1,cycle:1,now:()=>now});
 v.adventureProfile=()=>({stationary:false,range:550});
 v.setPlayer({id:'p',area,channel:1,x:800,y:940,hp:1000,last_seen:Math.floor(now/1000),loadlab_run_id:''});
 v.setMonster({id:'curuk-adv-'+('b'.repeat(32)),area,channel:1,x:800,y:480,hp:100000,spawn_round:1,is_stone:0,loadlab_run_id:''});
 assert.equal(v.nearby('p',now,true)?.length,1,'550 px configured tower boss must acquire a player 460 px away');
 v.adventureProfile=()=>({stationary:false,range:400});assert.equal(v.nearby('p',now,true)?.length,0,'the broad-phase radius must not widen configured aggro');
 v.setPlayer({...v.player('p'),area:'forest'});v.setMonster({...v.monster('curuk-adv-'+('b'.repeat(32))),area:'forest'});assert.equal(v.nearby('p',now,true)?.length,0,'normal-map aggro stays unchanged');
});

test('stationary adventure stones reject new and safely clear pre-upgrade retaliating encounters',async()=>{
 installRegistry();
 const area=mapArea('tower','a'.repeat(32),1),now=Date.now(),view=new AggroMemory({channel:1,cycle:1,now:()=>now});
 const player={id:'p',area,channel:1,x:800,y:480,hp:1000,last_seen:Math.floor(now/1000),loadlab_run_id:'',realtime_scope_version:1,arena_match_id:''},monster={id:'curuk-adv-'+('b'.repeat(32)),area,channel:1,x:800,y:480,hp:100000,spawn_round:1,is_stone:0,loadlab_run_id:''};
 const globals={__colAdventure:{profile:()=>({stationary:true,damage:1000,cadence:600})}},events=[];
 view.setPlayer(player);view.setMonster(monster);const memory=new RetaliationMemory({view,globals,publish:(...a)=>events.push(a)});
 memory.arm(player,monster,now);assert.equal(view.engagements.has(player.id),false);
 const engagement={monster_id:monster.id,spawn_round:1,next_hit_at_ms:now-1},row={player_id:player.id,...engagement,attackers489:JSON.stringify({[monster.id]:engagement})},frame={player,monster,armorItems:{results:[]}};
 view.setEngagement(player.id,row);const result=memory.step({playerId:player.id,settings:{},nowMs:now,engagement,frame});assert.deepEqual(result,{durable:false,result:null});assert.equal(view.engagements.has(player.id),false);assert.equal(view.player(player.id).hp,1000);assert.equal(events.length,0);
 // Existing persisted encounters must behave identically during cold/native
 // settlement and a durable writer job; only the stale entry is removed.
 const q=new DatabaseSync(':memory:');try{
  q.exec('CREATE TABLE pve_engagements(player_id TEXT,monster_id TEXT,spawn_round INTEGER,next_hit_at_ms INTEGER,attackers489 TEXT)');
  const db=nativeAtomicStatements(q),rules=createRetaliationRules({globals,publish:(...a)=>events.push(a)});
  for(const settle of [rules.retaliateNative,rules.retaliateWriter]){
   q.prepare('INSERT INTO pve_engagements VALUES(?,?,?,?,?)').run(player.id,monster.id,1,engagement.next_hit_at_ms,row.attackers489);
   assert.equal(await settle(db,player.id,{},now,engagement,frame),null);assert.equal(q.prepare('SELECT COUNT(*) n FROM pve_engagements').get().n,0);assert.equal(events.length,0);
  }
 }finally{q.close();}
});

test('tower and mist combat events remain isolated by run, floor, channel and cycle',()=>{
 installRegistry();
 const first=mapArea('tower','a'.repeat(32),1),second=mapArea('tower','a'.repeat(32),2),other=mapArea('tower','b'.repeat(32),1),mist=mapArea('mist','c'.repeat(32));
 for(const area of [first,mist,'forest']){
  const actor=(id,where,ch=1,cycle=1)=>({id,world_cycle:cycle,channel:ch,area:where,arena_match_id:'',is_gm:0,gm_invisible:0});
  const players=[actor('target',area),actor('same-room',area),actor('other-floor',second),actor('other-run',other),actor('other-channel',area,2),actor('other-cycle',area,1,2),actor('forest-observer',area==='forest'?first:'forest')];
  for(const event of [{type:'player_hit',targetId:'target',monsterId:'curuk-adv-'+('d'.repeat(32)),damage:25,hp:75},{type:'pvp_result',attackerId:'same-room',targetId:'target',damage:25,hp:75}]){
   const recipients=[...notificationViews({cycle:1,channels:[1],area,event},players).keys()].sort();assert.deepEqual(recipients,['same-room','target']);
  }
 }
});

test('real tower channel damages a nearby player and publishes native hit events and HP',{timeout:45000},async t=>{
 const s=await nativeHttpHost(t,{realmSetup:async(host,seed)=>{
  const q=host.database.sqlite;createTowerSchema(q);const c=structuredClone(TOWER_DEFAULTS);c.minLevel=1;c.floors[0].waves=1;
  c.floors[0].spawns=[{...c.floors[0].spawns[0],kind:'acolyte',count:1,hp:1000000,damage:1000,range:360,attackMs:600,drops:[]}];
  q.prepare('UPDATE kadim_tower_settings SET value=?').run(JSON.stringify(c));
  q.prepare("UPDATE players SET area='bazaar',x=2070,y=430,level=40,hp=10000,max_hp=10000,is_gm=0,loadlab_run_id='' WHERE id=?").run(seed.id);
  q.prepare('UPDATE bot_due SET due_ms=? WHERE account_id=?').run(Date.now()+120000,seed.account.id);
 }});
 const {f,host,core}=s;await host.database.atomic(()=>globalThis.__colLaunch.grant(f.account.id,true));const ticket=await s.http('character',{channel:1});assert.equal(ticket.status,200,JSON.stringify(ticket));const live=await s.connect(ticket);let seq=0;core.start();
 for(const row of s.supervisor.rows.values())row.child.on('message',m=>{if(m?.type==='test-native-failure')s.faults.push({error:Error(m.stack)});});
 const failures=()=>s.faults.map(x=>x.error?.stack??String(x)).join('\n');
 async function send(action,extra={}){const n=++seq;live.ws.send(JSON.stringify({type:'input',sequence:n,payload:{action,requestId:randomUUID(),...extra}}));await until(()=>live.packets.some(p=>p.results?.some(r=>r.sequence===n))||s.faults.length,8000);assert.equal(s.faults.length,0,failures());const r=live.packets.flatMap(p=>p.results??[]).find(r=>r.sequence===n);assert.equal(r?.status,200,JSON.stringify(r));return r;}
 await send('adventure_tower_enter');const p=f.sql.prepare('SELECT * FROM players WHERE id=?').get(f.id),m=f.sql.prepare('SELECT * FROM monsters WHERE area=? AND hp>0').get(p.area);assert(m);assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM dungeon_members WHERE player_id=?').get(f.id).n,0);
 await core.permanentPlayers([f.id],()=>f.sql.prepare('UPDATE players SET x=?,y=? WHERE id=?').run(m.x+100,m.y,f.id));
 const events=()=>live.packets.flatMap(p=>p.events??[]).filter(e=>e.type==='player_hit'&&e.monsterId===m.id);
 try{await until(()=>events().length>=2||s.faults.length,6000);}catch(error){error.message+=' '+JSON.stringify({player:f.sql.prepare('SELECT area,x,y,hp FROM players WHERE id=?').get(f.id),profile:f.sql.prepare('SELECT profile FROM adventure_monsters WHERE id=?').get(m.id),engagement:f.sql.prepare('SELECT * FROM pve_engagements WHERE player_id=?').get(f.id),packets:live.packets.slice(-3)});throw error;}
 assert.equal(s.faults.length,0,failures());assert(events().length>=2);assert(events().every(e=>e.damage>0&&e.hp<10000&&e.ability==='basic'));assert(events()[1].hp<events()[0].hp);
 const {applyWorldDelta}=await native('lib/world-push.mjs');const image=()=>{let data;for(const row of live.packets){if(row.world?.type==='world_snapshot')data=row.world.data;else if(data&&row.world?.type==='world_delta')data=applyWorldDelta(data,row.world);}return data;};
 await until(()=>image()?.players.find(p=>p.id===f.id)?.hp<10000,5000);
 const proof={monster:m.id,profile:JSON.parse(f.sql.prepare('SELECT profile FROM adventure_monsters WHERE id=?').get(m.id).profile),hits:events(),clientHp:image().players.find(p=>p.id===f.id).hp};
 await send('adventure_leave');assert.equal(f.sql.prepare('SELECT area FROM players WHERE id=?').get(f.id).area,'bazaar');assert(f.sql.prepare('SELECT hp FROM players WHERE id=?').get(f.id).hp<10000);proof.savedHp=f.sql.prepare('SELECT hp FROM players WHERE id=?').get(f.id).hp;proof.faults=s.faults.length;
 fs.writeFileSync('/tmp/r20-tower-retaliation.json',JSON.stringify(proof,null,2));t.diagnostic(JSON.stringify(proof));
});

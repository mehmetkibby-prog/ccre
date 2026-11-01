import test from 'node:test';
import assert from 'node:assert/strict';
import {setupPvp,put,update,json} from '../working/core511-source/scripts/core511/tests/pvp-fixture.mjs';
import {createRetaliationRules} from '../working/core511-source/scripts/core511/generated/retaliation-rules.mjs';
import {readRetaliationFrame} from '../working/core511-source/scripts/core511/retaliation-writer.mjs';
import {AggroMemory} from '../working/core511-source/scripts/core511/aggro-memory.mjs';
import {RetaliationMemory} from '../working/core511-source/scripts/core511/retaliation-memory.mjs';
import {RetaliationLoop} from '../working/core511-source/scripts/core511/retaliation-loop.mjs';
import {ActorCheckpoints} from '../working/core511-source/scripts/core511/actor-checkpoint.mjs';
import {EncounterCheckpoints} from '../working/core511-source/scripts/core511/encounter-checkpoint.mjs';
import {ResidentState} from '../working/core511-source/scripts/core511/resident-state.mjs';
import {ResourceLanes} from '../working/core511-source/scripts/core511/resource-lanes.mjs';
import {FixedLoop,DEFER_INPUT} from '../working/core511-source/scripts/core511/fixed-loop.mjs';
import {AttackLoop} from '../working/core511-source/scripts/core511/attack-loop.mjs';
import {OperationRandom} from '../working/core511-source/scripts/core511/operation-random.mjs';

async function fixture(t,{hp=1000}={}){
 const s=await setupPvp(t),now=s.nowMs,id=s.id,mid='golge-pre-attack-r86';s.reset({area:'forest',actor:{x:100,y:100,hp,max_hp:1000,hp_revision:1,special_guard_until_ms:0}});
 put(s.sql,'monsters',{id:mid,name:'Due prior attacker',area:'forest',channel:1,x:100,y:100,hp:1000000,max_hp:1000000,variant:'normal',spawn_round:1,is_boss:0,is_stone:0,summoned:0,parent_stone_id:''});
 const nativeEvents=[],rng=new OperationRandom(s.seed),rules=createRetaliationRules({globals:s.globals,fourChannels:true,now:()=>now,random:()=>rng.roll(),publish:(...e)=>nativeEvents.push(e)});
 const player=s.sql.prepare('SELECT * FROM players WHERE id=?').get(id),monster=s.sql.prepare('SELECT * FROM monsters WHERE id=?').get(mid);s.db.batch(rules.preparePveEngagement(s.db,player,monster,now-5000));
 const row=s.sql.prepare('SELECT * FROM pve_engagements WHERE player_id=?').get(id),hydration=readRetaliationFrame(s.sql,id,[row]),frame={player:hydration.player,monster:hydration.monsters[0],armorItems:hydration.armorItems};
 const state=new ResidentState(1),view=new AggroMemory({channel:1,cycle:1,now:()=>now});view.setPlayer(s.sql.prepare('SELECT * FROM players WHERE id=?').get(id));view.setMonster(monster);view.setEngagement(id,row);state.put('players',view.player(id));state.claim(id,1);
 const originalSet=view.setPlayer.bind(view);view.setPlayer=p=>{originalSet(p);state.put('players',p);};view.nearby=()=>assert.fail('pre-attack settlement must not acquire ambient targets');
 const encounters=new EncounterCheckpoints(pid=>view.engagements.get(pid)??null);encounters.hydrate(id,row);const setEngagement=view.setEngagement.bind(view);view.setEngagement=(pid,e)=>{encounters.observe(pid,view.engagements.get(pid)??null,e);setEngagement(pid,e);};
 const checkpoints=new ActorCheckpoints({state,encounters,clock:()=>now,submit:()=>assert.fail('nonterminal hit must use normal resident journal')}),events=[];checkpoints.hydrate(view.player(id));const memory=new RetaliationMemory({view,globals:s.globals,publish:(...e)=>events.push(e)}),lanes=new ResourceLanes();
 const frameFor=()=>({player:Object.fromEntries(Object.keys(frame.player).map(k=>[k,Object.hasOwn(view.player(id),k)?view.player(id)[k]:frame.player[k]])),monster:frame.monster,armorItems:frame.armorItems});
 const bridge=new RetaliationLoop({memory,lanes,checkpoints,combatCheckpoints:{drain:async()=>{}},submit:()=>assert.fail('terminal test must retain its pending drain'),frameFor,settings:()=>s.settings,committed:()=>assert.fail('no pending commit may be installed'),publish:(...e)=>events.push(e)});
 let attackPlans=0,captured;
 const attack=new AttackLoop({lanes,memory:{step:context=>{attackPlans++;captured=context.player;return {durable:false,result:{status:200,body:{ok:true}},events:[]};}},checkpoints,combatCheckpoints:{},submit:()=>assert.fail('no kill needed in sequencing test'),frameFor:()=>({player:state.read('players',id),playerId:id}),affectedActors:()=>[],committed:()=>{},publish:()=>{}});attack.beforeOrdinaryAttackR86=c=>bridge.beforeOrdinaryAttackR86(c);
 const kernel=new FixedLoop({state,clock:()=>now,wall:()=>now,send:()=>{},rules:{movement:()=>DEFER_INPUT,combat:ctx=>attack.attack(ctx),ai:()=>{},respawn:()=>{},project:()=>null}});kernel.admit(id,1);kernel.stopped=false;
 const input={action:'attack',ability:0,targetId:'golge-next-target-r86',spawnRound:1,intentId:'pre-attack-test'},context={id,input,inputOrder:1,now,kernel};
 const oldSeed=OperationRandom.seed;OperationRandom.seed=()=>s.seed;t.after(()=>{OperationRandom.seed=oldSeed;});
 return {...s,id,mid,now,rules,row,frame,view,state,encounters,checkpoints,memory,lanes,bridge,attack,kernel,input,context,nativeEvents,events,get plans(){return attackPlans;},get captured(){return captured;}};
}

test('pre-attack real native AI equals SQLite retaliation and reaches the first attack frame once without publishing rewards',async t=>{
 const f=await fixture(t),before=f.view.player(f.id);assert(f.row.next_hit_at_ms<=f.now);
 const expected=await f.rules.retaliateNative(f.db,f.id,f.settings,f.now,f.row,f.frame);assert(expected&&!expected.dead);
 const result=f.attack.attack({...f.context,epoch:1,receivedAtMs:f.now});assert.equal(result.status,200);assert.equal(f.plans,1);
 const saved=f.sql.prepare('SELECT * FROM players WHERE id=?').get(f.id),fields=['hp','hp_revision','last_monster_hit_at','combat_lock_until_ms','gems','essence'];for(const field of fields)assert.equal(f.view.player(f.id)[field],saved[field],field);
 assert(f.view.player(f.id).hp<before.hp);assert.equal(f.captured.hp,saved.hp);assert.deepEqual(json(f.view.engagements.get(f.id)),json(f.sql.prepare('SELECT * FROM pve_engagements WHERE player_id=?').get(f.id)));assert.deepEqual(json(f.events),json(f.nativeEvents));assert(f.checkpoints.changed(f.id));assert(f.encounters.changed(f.id));
 const after=f.view.player(f.id),eventCount=f.events.length;assert.equal(f.bridge.beforeOrdinaryAttackR86(f.context),true);assert.equal(f.view.player(f.id),after);assert.equal(f.events.length,eventCount);assert.equal(f.memory.metrics.hits,1);assert.equal(f.kernel.players.get(f.id).lastApplied,0);
});

test('terminal native retaliation retains its real barrier and leaves the original attack head queued',async t=>{
 const f=await fixture(t,{hp:1});f.checkpoints.drain=()=>new Promise(()=>{});
 f.kernel.enqueue(f.id,{sequence:1,epoch:1,kind:'combat',payload:f.input});await f.kernel.tick();const p=f.kernel.players.get(f.id);
 assert(p.barrier);assert.equal(p.queue.length,1);assert.equal(p.queue[0].sequence,1);assert.equal(p.lastApplied,0);assert.equal(f.plans,0);assert.equal(f.view.player(f.id).hp,1);assert.equal(f.events.length,0);assert.equal(f.state.owners.get(f.id).pending,1);assert.equal(f.lanes.busy(['player:'+f.id]),true);
});

test('ordinary due settlement retains busy-monster, actor hold and checkpoint deadline guards',async t=>{
 for(const mutation of [f=>f.lanes.acquire(['monster:'+f.mid],'held'),f=>{f.kernel.players.get(f.id).barrier=Promise.resolve();},f=>{f.kernel.players.get(f.id).suspended=true;},f=>{f.checkpoints.overdueR53=()=>true;}]){
  const f=await fixture(t),before=f.view.player(f.id);mutation(f);f.bridge.beforeOrdinaryAttackR86(f.context);assert.equal(f.view.player(f.id),before);assert.equal(f.events.length,0);assert.equal(f.memory.metrics.hits,0);
 }
});

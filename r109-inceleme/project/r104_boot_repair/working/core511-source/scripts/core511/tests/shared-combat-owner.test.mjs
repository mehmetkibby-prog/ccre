import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {BASE,hash,native,until} from './helpers.mjs';
import {SharedWorldRuntime} from '../shared-world.mjs';
import {SharedCombatAuthority,verifySharedLease} from '../generated/shared-lease-authority.mjs';
import {SharedWorldJobs} from '../shared-world-jobs.mjs';
import {sharedNeeds} from '../generated/shared-lease-selection.mjs';
const monster={id:'shared',area:'forest',channel:0,spawn_round:1,is_boss:1,is_stone:0,max_hp:100,hp:100,last_damaged_at_ms:0,last_regen_at_ms:100000,root_until_ms:0,stun_until_ms:0,control_x:null,control_y:null,wave_stage:0};
const peer=channel=>({channel,incarnation:'channel-'+channel,actor:'p'+channel,epoch:1}),empty=()=>({monsters:[],participants:[],bossParticipants:[],combatEvents:[]});
function runtime(){const writes=[],projections=[],faults=[],r=new SharedWorldRuntime({peer:{realm:'shared-owner',channel:0,role:'world',incarnation:'world-owner'},initial:{system:{incarnation:'world-owner',epoch:1,sequence:0,online:1},world:{cycle:1},settings:{},monsters:[monster],engagements:[],config:{}},clock:()=>100000,request:async(method,p)=>{if(method==='world_projection'){projections.push(p);return {version:p.version};}assert.equal(method,'system_command');writes.push(p);return {key:p.key,sequence:p.sequence,result:{saved:p.payload}};},onFatal:e=>faults.push(e)});return {r,writes,projections,faults};}

test('shared authority is the exact pinned native FIFO and signed lease with the sole public-channel extension',async()=>{
 const proof=JSON.parse(fs.readFileSync(new URL('../generated/shared-lease-proof.json',import.meta.url)));for(const p of proof.files){const text=fs.readFileSync(path.join(BASE,p.source),'utf8');assert.equal(hash(text),p.sourceSha256);assert.equal(hash(fs.readFileSync(new URL('../generated/'+p.generated,import.meta.url))),p.generatedSha256);assert.equal(text.replace(p.edit.from,p.edit.to),fs.readFileSync(new URL('../generated/'+p.generated,import.meta.url),'utf8'));}
 const nativeAuthority=(await native('vds-server/src/channel-shared-authority.mjs')).SharedCombatAuthority;
 for(const Type of [nativeAuthority,SharedCombatAuthority]){
  let value=0,recovered=0;const authority=new Type({incarnation:'world-test',secret:'s'.repeat(40),load:()=>value,recover:()=>{recovered++;value=99;}}),one=await authority.acquire(peer(1),'first'),two=authority.acquire(peer(2),'second');assert.equal(one.snapshot,0);let granted=false;two.then(()=>granted=true);await Promise.resolve();assert.equal(granted,false);
  assert.equal(verifySharedLease('s'.repeat(40),one.proof).channel,1);await authority.finish(peer(1),{proof:one.proof,value:7},next=>value=next);assert.equal((await two).snapshot,7);await authority.fence(peer(2));assert.equal(recovered,1);assert.equal((await authority.acquire(peer(3),'third')).snapshot,99);authority.close();
 }
 const four=new SharedCombatAuthority({incarnation:'world-four',secret:'s'.repeat(40),load:()=>4,recover:()=>{}});assert.equal((await four.acquire(peer(4),'fourth')).snapshot,4);four.close();
});

test('native shared selector and its exact ability normalization agree on both primary routes and unknown targets',async()=>{
 const {ChannelSharedCombat}=await native('vds-server/src/channel-shared-combat.mjs'),proof=JSON.parse(fs.readFileSync(new URL('../generated/shared-lease-proof.json',import.meta.url))).selector;assert.equal(hash(fs.readFileSync(path.join(BASE,proof.source))),proof.sourceSha256);assert.equal(hash(fs.readFileSync(new URL('../generated/'+proof.generated,import.meta.url))),proof.generatedSha256);
 const monsters=new Map([['shared',{id:'shared',area:'black'}]]),local=new Map([['local',{current:{id:'local',area:'forest'}}],['black',{current:{id:'black',area:'black'}}]]),original={monsters,database:{combat:{tables:new Map([['monsters',{records:local}]])}}},adapted={monsters,localMonster:id=>local.get(id)?.current};let cases=0;
 for(const action of ['attack','pvp_attack','move'])for(const role of ['avci','arkanist','muhafiz'])for(const ability of [undefined,-1,0,1,1.99,2,'2',2.9,3,4,NaN])for(const targetId of ['shared','local','black','missing']){const p={action,ability,targetId};assert.equal(sharedNeeds.call(adapted,p,{role}),ChannelSharedCombat.prototype.needs.call(original,p,{role}));cases++;}assert.equal(cases,396);
});

test('continuous shared borrowers service an overdue checkpoint before the next image without creating per-hit receipts',async()=>{
 const {r,writes}=runtime(),one=await r.sharedCombat.acquire(peer(1),'one');let time=0;r.journal.clock=()=>time;r.journal.at=0;
 const two=r.sharedCombat.acquire(peer(2),'two');time=5001;await r.sharedCombat.finish(peer(1),{proof:one.proof,changes:{...empty(),monsters:[{...monster,hp:90}]}});const next=await two;assert.equal(writes.length,1);assert.equal(next.snapshot.monsters[0].hp,90);await r.sharedCombat.finish(peer(2),{proof:next.proof,changes:empty()});assert.equal(writes.length,1);
});

test('four channel proposals serialize on one world HP and checkpoint all contributions once without per-hit SQL',async()=>{
 const {r,writes}=runtime(),grants=[1,2,3,4].map(ch=>r.sharedCombat.acquire(peer(ch),'hit-'+ch));
 for(let channel=1;channel<=4;channel++){
  const grant=await grants[channel-1];assert.equal(grant.snapshot.monsters[0].hp,110-channel*10);const changes=empty();changes.monsters=[{...grant.snapshot.monsters[0],hp:100-channel*10,last_damaged_at_ms:100000}];changes.participants=[{monster_id:'shared',spawn_round:1,player_id:'p'+channel,created_at:100,stone_damage476:0,stone_first_hit_at_ms476:0}];changes.bossParticipants=[{boss_round:1,player_id:'p'+channel,hit_count:1,total_damage:10,created_at:100}];changes.combatEvents=[{player_id:'p'+channel,target_id:'shared',role:'avci',ability:0,created_at:100000}];
  await r.sharedCombat.finish(peer(channel),{proof:grant.proof,changes});assert.equal(writes.length,0);
 }
 await r.sharedCombat.idle();await r.journal.drain();assert.equal(writes.length,1);assert.equal(writes[0].payload.monsters[0].current.hp,60);assert.equal(writes[0].payload.participants.length,4);assert.equal(writes[0].payload.bossParticipants.length,4);assert.equal(writes[0].payload.combatEvents.length,4);assert.equal(r.sharedCombat.busy,false);
});

test('shared finish waits for replica acknowledgement, fences wrong actor/epoch and rejects an entire terminal proposal',async()=>{
 const {r,faults}=runtime(),first=await r.sharedCombat.acquire(peer(1),'first'),next=r.sharedCombat.acquire(peer(2),'next');await assert.rejects(r.sharedCombat.finish({...peer(1),actor:'wrong'},{proof:first.proof,changes:empty()}),/shared_actor_lease_fenced/);await assert.rejects(r.sharedCombat.finish({...peer(1),epoch:2},{proof:first.proof,changes:empty()}),/shared_actor_lease_fenced/);
 let release;const wait=new Promise(resolve=>release=resolve);r.project=()=>wait;const finish=r.sharedCombat.finish(peer(1),{proof:first.proof,changes:empty()});let acquired=false;next.then(()=>acquired=true);await Promise.resolve();assert.equal(acquired,false);release();await finish;const second=await next;assert.equal(acquired,true);
 const before=r.sharedCombat.snapshot(),changes=empty();changes.monsters=[{...monster,hp:0}];changes.participants=[{monster_id:'shared',spawn_round:1,player_id:'p2',created_at:100,stone_damage476:10,stone_first_hit_at_ms476:100000}];await assert.rejects(r.sharedCombat.finish(peer(2),{proof:second.proof,changes}),/shared_proposal_monster/);assert.deepEqual(r.sharedCombat.snapshot(),before);assert.equal(faults.length,1);assert(r.sharedCombat.busy);assert.equal(r.lanes.busy(['monster:shared']),true);
});

test('world transition selects its final checkpoint and sequence only after channel freeze has drained accepted shared work',async()=>{
 const order=[],world={cycle:1,reset_at:1},r={initial:{world},setWorld:()=>{},lifecycle:{pending:null},journal:{drain:async()=>order.push('checkpoint')},sharedCombat:{idle:async()=>order.push('shared_idle')},project:async()=>order.push('project'),request:async(name,p)=>{if(name==='world_transition_prepare'){order.push('freeze');return {...p,prepared:true};}if(name==='world_cleanup')return {deferred:false};throw Error(name);},writer:{drain:async()=>order.push('writer_drain'),submit:async p=>{order.push(p.kind);if(p.kind==='world_upkeep')return {result:{worldPoint:{world}}};r.jobs.transition.refreshed=true;return {result:{world}};}}};r.jobs=new SharedWorldJobs(r);await r.jobs.run(100000);assert.deepEqual(order,['world_upkeep','freeze','shared_idle','checkpoint','writer_drain','project','world_transition']);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {BASE,SHA,hash} from './helpers.mjs';
import {createTransferRules} from '../generated/transfer-rules.mjs';
import {nativeTransferWriterGuard} from '../transfer-writer.mjs';
import {ChannelOwnership,OrderedWriterClient,registerOwnedRule} from '../ownership.mjs';
import {ActorCheckpoints,createActorCheckpointHandler} from '../actor-checkpoint.mjs';
import {ResidentState} from '../resident-state.mjs';
import {FixedLoop} from '../fixed-loop.mjs';
process.env.COL_NATIVE_TEST_ROOT=BASE;process.env.COL_NATIVE_TEST_MANIFEST_SHA256=SHA;
const {fixture}=await import('../../perf-r11/tests/reward/fixture.mjs');

test('native select_channel and eligibility blocks remain pinned to V510',()=>{
 const proof=JSON.parse(fs.readFileSync(new URL('../generated/transfer-proof.json',import.meta.url))),source=fs.readFileSync(path.join(BASE,proof.source),'utf8');
 const generated=fs.readFileSync(new URL('../generated/transfer-rules.mjs',import.meta.url),'utf8');
 assert.equal(hash(source),proof.sourceSha256);assert.equal(hash(generated),proof.generatedSha256);
 for(const row of [proof.branch,proof.plan,...proof.guards])assert.equal(hash(source.slice(row.start,row.end)),row.sha256);
 const expectedBranch=source.slice(proof.branch.start,proof.branch.end)
  .replace('clamp$1(Math.floor(Number(payload.channel) || 0), 1, 3)','clamp$1(Math.floor(Number(payload.channel) || 0), 1, 4)')
  .replace('if (payload.action === "select_channel") {','if (payload.action === "select_channel") {\n if(isAdventureArea(player.area))return Response.json({error:"Kanal değiştirmek için önce seferden çık."},{status:409});');
 assert(generated.includes(expectedBranch));
 for(const row of proof.guards)assert(generated.includes(source.slice(row.start,row.end)));
});
test('original dungeon, arena, death, retaliation, combat, region and world-reset channel guards still reject',async()=>{
 let locked=false,retaliationDead=false,transfers=0;
 const globals={__colDungeon:{locked:()=>locked},__colRuneV2:{settings:()=>({config:{enabled:false}})},__colRunes:{settings:()=>({config:{enabled:false}})}};
 const rules=createTransferRules({globals});
 const database={prepare:()=>({bind:()=>({first:()=>null})}),transferPlayer:async()=>{transfers++;return {channel:4};}};
 const player={id:'p',hp:100,channel:1,area:'bazaar',combat_lock_until_ms:0,reset_at:0,arena_match_id:null};
 const context={database,player,playerId:'p',settings:{channel_capacity:25},payload:{action:'select_channel',channel:4},now:100,requestReceivedAtMs:100000,settlePveEngagement:()=>({dead:retaliationDead})};
 for(const [change,pattern,status]of [[{hp:0},/yeniden doğmayı/,409],[{area:'arena'},/Arena/,409],[{arena_match_id:'match'},/Arena/,409],[{combat_lock_until_ms:100001},/Savaş/,409],[{area:'rune_v2'},/Rün/,403],[{area:'rune'},/rütbesi/,403],[{area:'ancient'},/erişimin/,403],[{reset_at:101},/Çekirdeği/,423]]){
  const response=await rules.selectChannel({...context,player:{...player,...change}});assert.equal(response.status,status);assert.match((await response.json()).error,pattern);
 }
 locked=true;assert.match((await (await rules.selectChannel(context)).json()).error,/zindan/);locked=false;
 retaliationDead=true;assert.match((await (await rules.selectChannel(context)).json()).error,/vuruşu önce/);retaliationDead=false;
 assert.equal(transfers,0);
 const response=await rules.selectChannel(context);assert.equal(response.status,200);assert.equal((await response.json()).channel,4);assert.equal(transfers,1);
});
async function nativeFixture(t){
 const f=await fixture();t.after(()=>f.close());const db=f.database,sqlite=db.sqlite,now=Date.now(),id='real-1';
 sqlite.prepare("UPDATE players SET area='bazaar',channel=1,hp=100,combat_lock_until_ms=0,arena_match_id='',last_seen=? WHERE id=?").run(Math.floor(now/1000),id);
 const authority=new ChannelOwnership(db,{realmId:'native-transfer'});await authority.initialize();
 const old={channel:1,incarnation:'old'},next={channel:4,incarnation:'new'};await authority.registerProcess(1,'old');await authority.registerProcess(4,'new');
 const owner=await authority.admit(id,old,{sessionId:'native-session',guard:()=>true});
 const request={epoch:owner.epoch,targetChannel:4,transferId:'native-transfer-1'};
 const options=()=>({player:{...sqlite.prepare('SELECT p.*,COALESCE(w.cycle,1) AS world_cycle FROM players p LEFT JOIN world_state w ON w.id=1 WHERE p.id=?').get(id)},targetChannel:4,now:Math.floor(now/1000),requestReceivedAtMs:now,settings:{...sqlite.prepare('SELECT * FROM game_settings WHERE id=1').get()}});
 return {f,db,sqlite,now,id,authority,old,next,owner,request,options};
}
test('real V510 party, arena queue, market scope and owner update commit together into channel4',async t=>{
 const s=await nativeFixture(t),{sqlite,id,authority,old,next,request}=s;
 sqlite.prepare('INSERT INTO parties(id,leader_id,created_at) VALUES(?,?,?)').run('transfer-party',id,1);
 sqlite.prepare('INSERT INTO party_members VALUES(?,?,?)').run(id,'transfer-party',1);
 sqlite.prepare('INSERT INTO party_members VALUES(?,?,?)').run('remaining-member','transfer-party',2);
 sqlite.prepare('INSERT INTO party_invites VALUES(?,?,?)').run('invitee',id,1);
 sqlite.prepare('INSERT INTO arena_queue(player_id,mode,team_name,channel,queued_at_ms,last_seen_ms) VALUES(?,?,?,?,?,?)').run(id,'1v1','native',1,s.now,s.now);
 sqlite.prepare('INSERT INTO market_shops(id,owner_id,owner_name,x,y,channel,created_at) VALUES(?,?,?,?,?,?,?)').run('native-shop',id,'owner',1,1,1,1);
 const before=sqlite.prepare('SELECT realtime_scope_version FROM players WHERE id=?').get(id).realtime_scope_version;
 const transition=nativeTransferWriterGuard(s.options());
 await authority.beginOwnedTransfer(id,old,request);await authority.release(id,old,{...request,finalSequence:0});
 const result=await authority.acceptOwnedTransfer(id,next,request,transition);assert.equal(result.channel,4);
 const player=sqlite.prepare('SELECT channel,realtime_scope_version FROM players WHERE id=?').get(id);assert.equal(player.channel,4);assert.equal(player.realtime_scope_version,before+1);
 assert.equal(sqlite.prepare('SELECT 1 FROM party_members WHERE player_id=?').get(id),undefined);
 assert.equal(sqlite.prepare('SELECT leader_id FROM parties WHERE id=?').get('transfer-party').leader_id,'remaining-member');
 assert.equal(sqlite.prepare('SELECT 1 FROM party_invites WHERE sender_id=?').get(id),undefined);
 assert.equal(sqlite.prepare('SELECT 1 FROM arena_queue WHERE player_id=?').get(id),undefined);
 assert.equal(sqlite.prepare('SELECT channel FROM market_shops WHERE owner_id=?').get(id).channel,4);
 assert.equal(authority.admission(id).channel,4);
 await authority.acceptOwnedTransfer(id,next,request,transition);assert.equal(sqlite.prepare('SELECT realtime_scope_version FROM players WHERE id=?').get(id).realtime_scope_version,before+1);
});
test('native writer refuses a changed HP revision or active dungeon after preflight',async t=>{
 const s=await nativeFixture(t),{sqlite,id,authority,old,next,request}=s;
 const stale=nativeTransferWriterGuard(s.options());await authority.beginOwnedTransfer(id,old,request);await authority.release(id,old,{...request,finalSequence:0});
 sqlite.prepare('UPDATE players SET hp_revision=hp_revision+1 WHERE id=?').run(id);
 await assert.rejects(authority.acceptOwnedTransfer(id,next,request,stale),/transfer_snapshot_conflict/);assert.equal(authority.admission(id).channel,1);
 const current=nativeTransferWriterGuard(s.options());sqlite.prepare('INSERT INTO dungeon_members(player_id,run_id) VALUES(?,?)').run(id,'active-dungeon');
 await assert.rejects(authority.acceptOwnedTransfer(id,next,request,current),/dungeon_transfer_locked/);
 assert.equal(sqlite.prepare('SELECT channel FROM players WHERE id=?').get(id).channel,1);
 assert.equal(sqlite.prepare('SELECT count(*) n FROM kernel511_transfers').get().n,0);
});

test('accepted input and final native checkpoint drain before channel4 ownership can replace source',async t=>{
 const s=await nativeFixture(t),{db,sqlite,id,authority,old,next,owner,request}=s;
 const row={...sqlite.prepare('SELECT * FROM players WHERE id=?').get(id)},state=new ResidentState(1),packets=[];
 state.put('players',{...row,cycle:1});state.claim(id,owner.epoch);
 registerOwnedRule(authority,'actor_checkpoint',createActorCheckpointHandler(),{duringDrain:true});
 const writer=new OrderedWriterClient({peer:old,owner:()=>owner,request:(p,r)=>authority.command(p,r)});writer.seed(id,owner.epoch,owner.sequence);
 const checkpoints=new ActorCheckpoints({state,submit:e=>writer.submit(e)});checkpoints.hydrate(row);
 const kernel=new FixedLoop({state,send:(id,packet)=>packets.push(packet),rules:{
  movement:({state,id})=>{const p=state.read('players',id);state.patch('players',id,{x:p.x+1,position_revision:p.position_revision+1,movement_checked_at_ms:s.now});return {ok:true};},
  combat:()=>({ok:true}),ai:()=>{},respawn:()=>{},project:({results,lastApplied})=>results.length?{results,lastApplied}:null,
 }});kernel.admit(id,owner.epoch);kernel.stopped=false;t.after(()=>kernel.stop());
 kernel.enqueue(id,{epoch:owner.epoch,sequence:1,kind:'movement',payload:{}});
 let quiet=false;const quiesced=kernel.quiesce(id,owner.epoch).then(()=>quiet=true);
 assert.equal(quiet,false);assert.throws(()=>kernel.enqueue(id,{epoch:owner.epoch,sequence:2,kind:'movement',payload:{}}),/actor_draining/);
 kernel.tick();await quiesced;assert.equal(packets[0].lastApplied,1);assert.equal(state.owners.get(id).state,'quiesced');
 const durable=db.durableAfterCommit.bind(db);let release;const hold=new Promise(r=>release=r);db.durableAfterCommit=()=>Promise.resolve(durable()).then(()=>hold);
 t.after(()=>release());const checkpoint=checkpoints.drain(id);await new Promise(r=>setTimeout(r,5));
 assert.throws(()=>writer.finalSequence(id),/channel_not_drained/);assert.throws(()=>kernel.detach(id,owner.epoch),/owner_epoch_fenced/);
 release();await checkpoint;db.durableAfterCommit=durable;
 assert.equal(sqlite.prepare('SELECT x FROM players WHERE id=?').get(id).x,row.x+1);
 const transition=nativeTransferWriterGuard(s.options());await authority.beginOwnedTransfer(id,old,request);state.freeze(id,owner.epoch);
 await authority.release(id,old,{...request,finalSequence:writer.finalSequence(id)});
 const accepted=await authority.acceptOwnedTransfer(id,next,request,transition);kernel.detach(id,owner.epoch);checkpoints.forget(id);
 assert.equal(accepted.channel,4);assert.equal(state.read('players',id),null);assert.equal(kernel.players.has(id),false);assert.equal(sqlite.prepare('SELECT x FROM players WHERE id=?').get(id).x,row.x+1);
});

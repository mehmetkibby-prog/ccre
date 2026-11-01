import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {native,temporary} from './helpers.mjs';
import {setupPvp,json,put,update,response} from './pvp-fixture.mjs';
import {createAttackRules} from '../generated/attack-rules.mjs';
import {readAttackFrame} from '../attack-writer.mjs';
import {createActionWriterHandler,actionRandom} from '../action-writer.mjs';
import {ChannelOwnership,registerOwnedRule} from '../ownership.mjs';
import {SkillMemory} from '../skill-memory.mjs';
import {DurableWorldState,readWorldPoint} from '../world-state.mjs';
const tables=['world_state','players','player_items','world_drops','dungeon_materials','player_stones','guild_essence_rewards','messages','fishing_sessions'];
const capture=sql=>Object.fromEntries(tables.map(table=>[table,json(sql.prepare('SELECT * FROM '+table+' ORDER BY rowid').all())]));
const fixedSqlClock=(s,nowMs)=>s.sql.function('strftime',{varargs:true},pattern=>{assert.equal(pattern,'%s');return String(Math.floor(nowMs/1000));});
async function parity(s,input,{nowMs=s.nowMs,actors=()=>[],globals=s.globals}={}){
 // Native movement triggers stamp SQLite wall time. Both oracle and adapter
 // must share the same fixed SQL clock as their already fixed JS action time.
 fixedSqlClock(s,nowMs);
 const expectedFrame={player:readAttackFrame(s.sql,s.id,'',globals).player,settings:s.settings},events=[],rates=[],actualRates=[];
 const original=createAttackRules({globals,...actionRandom(s.seed),now:()=>nowMs,response,ports:{publishRealtimeRoomEvent:(...a)=>{events.push(a);},publishRealtimeWorldEvent:(...a)=>{events.push(a);},deliverRealtime:v=>v,settlePveEngagement:()=>null,enforceRateLimit:(...a)=>{rates.push(a);}}});
 s.sql.exec('SAVEPOINT action_oracle');const expected=await original.nativeAction(s.db,{...expectedFrame,playerId:s.id,payload:input,requestReceivedAtMs:nowMs,now:Math.floor(nowMs/1000),auth:{account:{id:s.sql.prepare('SELECT account_id FROM players WHERE id=?').get(s.id).account_id}}}),after=capture(s.sql);s.sql.exec('ROLLBACK TO action_oracle;RELEASE action_oracle');
 const handler=createActionWriterHandler({settingsFor:()=>s.settings,globalsFor:()=>globals,assertOwnership:()=>true,assertResources:()=>true,affectedActors:actors,settleRetaliation:()=>null,enforceRateLimit:(_, ...a)=>{actualRates.push(a);},clock:()=>nowMs});
 const actual=await s.f.database.atomic(sql=>handler(sql,{input,seed:s.seed,nowMs,receivedAtMs:nowMs,expected:expectedFrame},{actor:s.id}));
 assert.deepEqual(json(actual.result),json(expected),input.action);assert.deepEqual(json(actual.events),json(events));assert.deepEqual(actualRates,rates);assert.deepEqual(capture(s.sql),after,input.action);return actual;
}
test('native donation preserves amount bounds, decayed health, saturation and atomic contribution',async t=>{
 const s=await setupPvp(t);for(const health of [0,50,99.9])for(const age of [-10,0,12])for(const amount of [0,1,100,1001,1.5]){
  s.reset({area:'bazaar',actor:{essence:1000,contribution:7}});s.sql.prepare('UPDATE world_state SET health=?,updated_at=?,reset_at=0 WHERE id=1').run(health,Math.floor(s.nowMs/1000)-age);const result=await parity(s,{action:'donate',amount});assert.equal(result.result.status,Number.isSafeInteger(amount)&&amount>=1&&amount<=1000?200:400);
 }
});
test('native respawn preserves region, arena countdown/round and no-early-revive rules',async t=>{
 const s=await setupPvp(t);for(const area of ['forest','frozen','black','war','rune_v2','arena'])for(const ready of [false,true]){s.reset({area,actor:{hp:0,respawn_at_ms:s.nowMs+(ready?-1:1000)}});const result=await parity(s,{action:'respawn'});assert.equal(result.result.status,ready?200:409,area);}
 s.reset({area:'arena',actor:{hp:0,respawn_at_ms:s.nowMs-1}});update(s.sql,'arena_matches','pvp-match',{mode:'3v3',team_size:3});const waiting=await parity(s,{action:'respawn'});assert.equal(waiting.result.body.code,'arena_waiting_for_round498');
});
test('native loot kinds, party essence and rare announcement retain atomic delivery and repeat rejection',async t=>{
 const s=await setupPvp(t);
 for(const kind of ['strong_branch','halloween_pumpkin','crystal_chest','moonlight_chest','pearl','stone_dust','stone_book','evolution_scroll','essence','weapon','gems','potions']){
  const area=['gems','potions'].includes(kind)?'rune_v2':'forest';s.reset({area});const id='collect-'+kind;
  put(s.sql,'world_drops',{id,owner_id:s.id,monster_id:area==='rune_v2'?'rune-v2-mob':'golge-collect',kind,item_name:'Native '+kind,rarity:kind==='weapon'?'red':'white',power:20,amount:3,role:'avci',enchantments:'[]',x:1000,y:1000,expires_at:Math.floor(s.nowMs/1000)+120,collectible_at:Math.floor(s.nowMs/1000)});
  if(kind==='essence'){put(s.sql,'parties',{id:'loot-party',leader_id:s.id,created_at:1});for(const [n,pid]of [s.id,s.targetId].entries())put(s.sql,'party_members',{party_id:'loot-party',player_id:pid,joined_at:n+1});}
  const result=await parity(s,{action:'collect',targetId:id},{actors:()=>kind==='essence'?[s.targetId]:[]});assert.equal(result.result.status,200,kind);assert.equal(result.result.body.ok,true,kind);assert.equal(s.sql.prepare('SELECT id FROM world_drops WHERE id=?').get(id),undefined);const replay=await parity(s,{action:'collect',targetId:id});assert.equal(replay.result.status,404);
 }
});
test('native potion consumption/automatic bounds and guardian action preflight match',async t=>{
 const s=await setupPvp(t);
 for(const area of ['forest','war','arena'])for(const automatic of [false,true]){s.reset({area,actor:{hp:100,potions:2,auto_potion_owned:1,auto_potion_enabled:1,auto_potion_remaining:400,auto_potion_total:400,auto_potion_at_ms:0}});await parity(s,{action:'use_potion',automatic});}
 for(const actor of [{},{rod_equipped:1},{stun_until_ms:s.nowMs+1},{root_until_ms:s.nowMs+1}]){s.reset({role:'muhafiz',area:'forest',actor});await parity(s,{action:'guardian_dash',directionX:1,directionY:0});}
});
test('native fishing start, ordered input proof, finish gate, cancellation and sale match',async t=>{
 const s=await setupPvp(t);s.reset({area:'fishing',actor:{has_rod:1,rod_equipped:1,x:1960,y:745}});
 const start=await parity(s,{action:'start_fishing'});assert.equal(start.result.body.ok,true);const session=s.sql.prepare('SELECT * FROM fishing_sessions WHERE player_id=?').get(s.id);
 await parity(s,{action:'fishing_input',fishingNonce:session.nonce,inputSequence:1,holding:true,inputElapsedMs:1000},{nowMs:session.bite_at_ms+1000});
 const stale=await parity(s,{action:'fishing_input',fishingNonce:session.nonce,inputSequence:1,holding:false,inputElapsedMs:1000},{nowMs:session.bite_at_ms+1100});assert.equal(stale.result.status,409);
 const early=await parity(s,{action:'finish_fishing',fishingNonce:session.nonce},{nowMs:session.bite_at_ms+1200});assert.equal(early.result.status,425);
 await parity(s,{action:'cancel_fishing',fishingNonce:session.nonce},{nowMs:session.bite_at_ms+1300});assert.equal(s.sql.prepare('SELECT * FROM fishing_sessions WHERE player_id=?').get(s.id),undefined);
 update(s.sql,'players',s.id,{x:1770,y:970,fish_sokan:2,fish_levrek:3,fish_zargana:4});await parity(s,{action:'sell_fish',fishKind:'all'});
});
test('resident support/dash use complete native preflight without SQL and defer locked party peers',async t=>{
 const s=await setupPvp(t);fixedSqlClock(s,s.nowMs);
 for(const [action,role,specialization]of [['guardian_dash','muhafiz',''],['cast_support456','arkanist','arkanist_heal'],['cast_support456','muhafiz','muhafiz_tank']]){
  const c=s.reset({area:'forest',role,actor:{specialization,hp:100},victim:{hp:100,max_hp:1000}});
  put(s.sql,'parties',{id:'skill-party',leader_id:s.id,created_at:1});for(const pid of [s.id,s.targetId]){put(s.sql,'party_members',{party_id:'skill-party',player_id:pid,joined_at:1});c.party.set(pid,'skill-party');}
  const input={action,directionX:1,directionY:0},context={player:readAttackFrame(s.sql,s.id,'',s.globals).player,playerId:s.id,settings:s.settings,payload:input,requestReceivedAtMs:s.nowMs},events=[];
  const nativeRules=createAttackRules({globals:s.globals,...actionRandom(s.seed),now:()=>s.nowMs,response,ports:{publishRealtimeRoomEvent:(...a)=>{events.push(a);},deliverRealtime:v=>v}});
  const memory=new SkillMemory({view:c.view,globals:s.globals,party:id=>c.party.get(id),arena:id=>c.arenas.get(id),team:(match,id)=>c.teams.get(match+':'+id),blocked:()=>false});
  if(action==='cast_support456'&&role==='arkanist'){const before=json([...c.view.players]);memory.blocked=id=>id===s.targetId;assert.equal(memory.step(context,{...actionRandom(s.seed),nowMs:s.nowMs}).deferred,true);assert.deepEqual(json([...c.view.players]),before);memory.blocked=()=>false;}
  const prepare=s.sql.prepare;let actual;s.sql.prepare=()=>{throw Error('skill hot SQL');};try{actual=memory.step(context,{...actionRandom(s.seed),nowMs:s.nowMs});}finally{s.sql.prepare=prepare;}
  const expected=action==='guardian_dash'?await nativeRules.nativeAction(s.db,{...context,now:Math.floor(s.nowMs/1000)}):await nativeRules.colSupportCast456(s.db,context.player,s.settings,input,s.nowMs);
  assert.deepEqual(json(actual.result),json(expected));assert.deepEqual(json(actual.events),json(events));for(const p of c.view.players.values())assert.deepEqual(json(p),json(s.sql.prepare('SELECT * FROM players WHERE id=?').get(p.id)));
 }
});
const crashKinds=['strong_branch','crystal_chest','moonlight_chest','pearl','stone_dust','stone_book','evolution_scroll','essence','weapon','gems','potions','use_potion','finish_fishing','respawn','donate'];
for(const kind of crashKinds)for(const phase of ['before','after'])test('actual '+kind+' SIGKILL '+phase+' COMMIT retains exactly one accepted action',async t=>{
 const s=await setupPvp(t);s.reset({area:['gems','potions'].includes(kind)?'rune_v2':kind==='finish_fishing'?'fishing':'forest',actor:kind==='use_potion'?{hp:100,potions:2}:kind==='respawn'?{hp:0,respawn_at_ms:s.nowMs-1}:kind==='finish_fishing'?{has_rod:1,rod_equipped:1}:kind==='donate'?{essence:1000,contribution:0}: {}});
 let input;
 if(kind==='use_potion'||kind==='respawn')input={action:kind};
 else if(kind==='donate'){input={action:'donate',amount:100};s.sql.prepare('UPDATE world_state SET health=50,updated_at=? WHERE id=1').run(Math.floor(s.nowMs/1000));}
 else if(kind==='finish_fishing'){
  put(s.sql,'fishing_sessions',{player_id:s.id,nonce:'fishing-crash-511',fish_kind:'sokan',started_at_ms:s.nowMs-10000,bite_at_ms:s.nowMs-8000,earliest_finish_at_ms:s.nowMs-2000,expires_at_ms:s.nowMs+5000,proof_updated_at_ms:s.nowMs-100,proof_sequence:9,proof_bar:580000,proof_velocity:0,proof_progress:1000000,proof_holding:0,proof_samples:50,proof_changes:20,proof_seed:1258});input={action:'finish_fishing',fishingNonce:'fishing-crash-511'};
 }else{put(s.sql,'world_drops',{id:'crash-drop',owner_id:s.id,monster_id:['gems','potions'].includes(kind)?'rune-v2-mob':'golge-crash',kind,item_name:'Crash '+kind,rarity:'white',power:10,amount:2,role:'avci',enchantments:'[]',x:1000,y:1000,expires_at:Math.floor(s.nowMs/1000)+120,collectible_at:Math.floor(s.nowMs/1000)});input={action:'collect',targetId:'crash-drop'};}
 const source=new ChannelOwnership(s.f.database,{realmId:'action-crash'});await source.initialize();const peer={channel:1,incarnation:'action-owner'};await source.registerProcess(1,peer.incarnation);const owner=await source.admit(s.id,peer,{sessionId:'action-crash-session',guard:()=>true});
 if(kind==='donate')await new DurableWorldState(s.f.database).initialize();
 const request={playerId:s.id,epoch:owner.epoch,sequence:1,operationId:'action-crash-once',operation:'native_action',payload:{nowMs:s.nowMs,receivedAtMs:s.nowMs,seed:s.seed,input,expected:{player:readAttackFrame(s.sql,s.id,'',s.globals).player,settings:s.settings}}};
 const dir=temporary(t),file=path.join(dir,'action.sqlite'),inputFile=path.join(dir,'input.json'),marker=path.join(dir,'phase.txt');s.sql.exec('PRAGMA wal_checkpoint(TRUNCATE)');fs.copyFileSync(s.f.file,file);fs.writeFileSync(inputFile,JSON.stringify({request,peer,settings:s.settings}));
 const child=spawn(process.execPath,[path.join(import.meta.dirname,'action-crash-fixture.mjs'),file,inputFile,phase,marker],{stdio:['ignore','ignore','pipe']});let stderr='';child.stderr.on('data',b=>stderr+=b);const [code,signal]=await once(child,'exit');assert.equal(signal,'SIGKILL',stderr);assert.equal(code,null);assert.equal(fs.readFileSync(marker,'utf8'),phase==='before'?'uncommitted_action':'durable_action_before_ack');
 const {LocalDatabase}=await native('vds-server/src/database.mjs'),db=new LocalDatabase(file,{groupWrites:true,asyncDurable:true});t.after(()=>db.close());assert.equal(db.sqlite.prepare('SELECT count(*) n FROM kernel511_channel_receipts WHERE operation_id=?').get(request.operationId).n,phase==='after'?1:0);
 if(kind==='donate'){const point=readWorldPoint(db.sqlite);assert.equal(point.revision,phase==='after'?1:0);assert.equal(db.sqlite.prepare('SELECT essence FROM players WHERE id=?').get(s.id).essence,phase==='after'?900:1000);assert.equal(point.world.health>50,phase==='after');await new DurableWorldState(db).initialize();}
 const authority=new ChannelOwnership(db,{realmId:'action-crash'});await authority.initialize();registerOwnedRule(authority,'native_action',createActionWriterHandler({settingsFor:()=>s.settings,globalsFor:()=>s.globals,assertOwnership:(sql,p,id,epoch)=>Boolean(authority.assertAdmitted(sql,p,id,epoch)),assertResources:()=>true,affectedActors:()=>[],settleRetaliation:()=>null,enforceRateLimit:()=>{},clock:()=>s.nowMs}));
 const a=await authority.command(peer,request),after=capture(db.sqlite),b=await authority.command(peer,request);assert.equal(a.result.result.body.ok,true);assert.deepEqual(json(a),json(b));assert.deepEqual(capture(db.sqlite),after);if(input.action==='collect')assert.equal(db.sqlite.prepare('SELECT * FROM world_drops WHERE id=?').get(input.targetId),undefined);
});

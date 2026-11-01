import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {nativeHttpHost} from '../../working/core511-source/scripts/core511/tests/native-http-host-fixture.mjs';
import {extraPlayer,combatState} from '../../working/core511-source/scripts/core511/tests/process-fixture.mjs';
import {put} from '../../working/core511-source/scripts/core511/tests/pvp-fixture.mjs';
import {until} from '../../working/core511-source/scripts/core511/tests/helpers.mjs';

for(const variant of ['boss','sinsi','boss-broad'])test(variant+': exact native GameWriter, four child channels, world and WS claim retains recipient economy and durable receipt', {timeout:45000}, async t=>{
 const kind=variant.startsWith('boss')?'boss':'sinsi',broad=variant==='boss-broad';
 const s=await nativeHttpHost(t);await s.world.stopJobs();const {f,host,writer,world,supervisor,core}=s,sql=f.sql;
 const recipient=extraPlayer(s,201),bystander=extraPlayer(s,202),offline=extraPlayer(s,203,undefined,{offline:true});
 await host.database.atomic(()=>{
  for(const id of [f.id,recipient.id,bystander.id,offline.id])sql.prepare("UPDATE players SET area=?,channel=1,level=40,xp=0,x=1000,y=1000,last_seen=CAST(strftime('%s','now') AS INTEGER) WHERE id=?").run(kind==='boss'?'sanctum':'sinsi',id);
  for(const id of [f.id,recipient.id,bystander.id])globalThis.__colLaunch.grant(sql.prepare('SELECT account_id FROM players WHERE id=?').get(id).account_id,true);
 });
 const ticket=await s.http('character',{channel:1});assert.equal(ticket.status,200,JSON.stringify(ticket));const live=await s.connect(ticket);
 const rt=await recipient.http('character',{channel:2});assert.equal(rt.status,200,JSON.stringify(rt));await s.connect(rt);
 const bt=await bystander.http('character',{channel:4});assert.equal(bt.status,200,JSON.stringify(bt));const bl=await s.connect(bt);
 const target=kind==='boss'?'dunya-bosu-1':'sinsi-tasi-r85-1',round=9007,now=Math.floor(Date.now()/1000);
 await core.permanentPlayers([f.id,recipient.id,offline.id],()=>{
  sql.prepare('UPDATE players SET channel=2 WHERE id=?').run(offline.id);
  put(sql,'parties',{id:'reward-party',leader_id:recipient.id,created_at:now});
  for(const id of [recipient.id,offline.id])put(sql,'party_members',{party_id:'reward-party',player_id:id,joined_at:now});
  if(kind==='boss')put(sql,'boss_defeats',{boss_round:round,defeated_at:now,x:1000,y:1000,xp_reward:100});
  else put(sql,'sinsi_defeats',{monster_id:target,spawn_round:round,defeated_at:now,x:1000,y:1000,xp_reward:100});
  for(const id of [f.id,recipient.id]){
   if(kind==='boss')put(sql,'boss_participants',{boss_round:round,player_id:id,total_damage:100,hit_count:1,created_at:now});
   put(sql,'monster_participants',{monster_id:target,spawn_round:round,player_id:id,created_at:now,stone_damage476:100});
  }
 });
 const holds=[],replies=[];for(const row of core.processes.values()){const request=row.control.request.bind(row.control);row.control.request=async(method,payload)=>{const value=await request(method,payload);if(method==='shared_hold')holds.push({channel:row.peer.channel,payload,answer:value});return value;};}
 const command=writer.command.bind(writer);let originalRequest,originalPeer,potionHeld=false,potionReleased=false,releasePotion;const potionGate=new Promise(resolve=>releasePotion=()=>{potionReleased=true;resolve();});
 writer.command=async(peer,request)=>{const ack=await command(peer,request);if(request.playerId===bystander.id&&request.payload?.input?.action==='use_potion'){potionHeld=true;await potionGate;}if(request.payload?.input?.action==='claim_rewards'){originalRequest??=request;originalPeer??=peer;replies.push(ack);}return ack;};
 if(broad){const prepare=world.combat.prepare.bind(world.combat);world.combat.prepare=(peer,payload)=>{const {foregroundClaimR85,...rest}=payload;return prepare(peer,rest);};}
 bl.ws.send(JSON.stringify({type:'input',sequence:1,payload:{action:'use_potion'}}));await until(()=>potionHeld||s.faults.length,7000);assert(potionHeld);
 const delayedRelease=setTimeout(releasePotion,900);delayedRelease.unref();const began=performance.now();
 const payload={action:'claim_rewards',rewardTargets:[{id:target,spawnRound:round}]};
 live.ws.send(JSON.stringify({type:'input',sequence:1,payload}));
 await until(()=>live.packets.some(p=>p.results?.some(r=>r.sequence===1))||s.faults.length,15000);
 assert.equal(s.faults.length,0,s.faults.map(x=>x.error?.stack).join('\n'));
 const answer=live.packets.flatMap(p=>p.results??[]).find(r=>r.sequence===1);assert.equal(answer.status,200,JSON.stringify(answer));assert.equal(answer.body.processed,1,JSON.stringify(answer));
 const claimMs=performance.now()-began;if(!broad)assert.equal(potionReleased,false,'unrelated durable potion ACK must not delay claimant');else assert(potionReleased,'broad baseline waits unrelated owner');releasePotion();clearTimeout(delayedRelease);
 assert.equal(holds.length,4);assert(holds.every(h=>broad?h.payload.only===undefined:Array.isArray(h.payload.only)),JSON.stringify(holds));
 assert.deepEqual(holds.flatMap(h=>h.answer.actors.map(a=>a.id)).sort(),(broad?[recipient.id,bystander.id]:[recipient.id]).sort());
 const xp=id=>sql.prepare('SELECT xp FROM players WHERE id=?').get(id).xp;
 assert(xp(f.id)>0);assert(xp(recipient.id)>0);assert(xp(offline.id)>0);assert.equal(xp(bystander.id),0);
 const claimTable=kind==='boss'?'boss_reward_claims':'sinsi_reward_claims';assert.equal(sql.prepare('SELECT COUNT(*) n FROM '+claimTable).get().n,2);
 const snapshot=()=>JSON.stringify({players:sql.prepare('SELECT id,xp,gems FROM players ORDER BY id').all(),drops:sql.prepare('SELECT * FROM world_drops ORDER BY id').all(),claims:sql.prepare('SELECT * FROM '+claimTable+' ORDER BY player_id').all(),xp:sql.prepare('SELECT * FROM monster_xp_claims ORDER BY player_id').all()});
 const before=snapshot(),replay=await writer.command(originalPeer,originalRequest);assert.equal(JSON.stringify(replay),JSON.stringify(replies[0]));assert.equal(snapshot(),before);
 const states=await Promise.all([1,2,4].map(ch=>combatState(supervisor.rows.get(ch))));assert.equal(states[1].players.find(p=>p.id===recipient.id).xp,xp(recipient.id));assert(states.every(state=>state.players.every(p=>!p.suspended&&!p.external)));
 live.ws.send(JSON.stringify({type:'input',sequence:2,payload}));await until(()=>live.packets.some(p=>p.results?.some(r=>r.sequence===2))||s.faults.length,15000);assert.equal(s.faults.length,0);assert.equal(snapshot(),before);
 const evidence={kind,variant,claimMs,unrelatedAckDelayMs:900,selectedByChannel:holds.slice(0,4).map(h=>({channel:h.channel,selected:h.payload.only??null})),heldActors:holds.slice(0,4).flatMap(h=>h.answer.actors.map(a=>a.id)),refresh:replies[0].result.sharedRefresh,reply:answer,claimCount:2,offlineXp:xp(offline.id),recipientXp:xp(recipient.id),realProcesses:5,exactReplay:true};
 fs.writeFileSync(new URL('../../evidence/foreground-native-'+variant+'-r85.json',import.meta.url),JSON.stringify(evidence,null,2)+'\n');
});

for(const escape of ['global','actor'])test('real native '+escape+' cold effect outside selected claim rolls back economy and receipt before ACK', {timeout:45000}, async t=>{
 const s=await nativeHttpHost(t);await s.world.stopJobs();const {f,host,writer,world,core}=s,sql=f.sql,other=extraPlayer(s,301);
 await host.database.atomic(()=>{sql.prepare("UPDATE players SET area='sanctum',level=40,xp=0 WHERE id=?").run(f.id);globalThis.__colLaunch.grant(f.account.id,true);});
 const ticket=await s.http('character',{channel:1});assert.equal(ticket.status,200,JSON.stringify(ticket));const live=await s.connect(ticket),round=9011,now=Math.floor(Date.now()/1000);
 await core.permanentPlayers([f.id],()=>{put(sql,'boss_defeats',{boss_round:round,defeated_at:now,x:1000,y:1000,xp_reward:100});put(sql,'boss_participants',{boss_round:round,player_id:f.id,total_damage:100,hit_count:1,created_at:now});put(sql,'monster_participants',{monster_id:'dunya-bosu-1',spawn_round:round,player_id:f.id,created_at:now});});
 const snapshot=()=>JSON.stringify({players:sql.prepare('SELECT id,xp,gems FROM players ORDER BY id').all(),drops:sql.prepare('SELECT * FROM world_drops ORDER BY id').all(),claims:sql.prepare('SELECT * FROM boss_reward_claims ORDER BY player_id').all(),settings:sql.prepare('SELECT boss_red_chance FROM game_settings').all(),receipts:sql.prepare("SELECT operation_id FROM kernel511_channel_receipts WHERE operation_id LIKE 'shared:%' ORDER BY operation_id").all()});
 const before=snapshot(),run=writer.sharedRefresh.run.bind(writer.sharedRefresh);let injected=false;
 writer.sharedRefresh.run=(db,payload,context,work,options)=>run(db,payload,context,()=>{const result=work();if(payload.input?.action==='claim_rewards'&&!injected){injected=true;if(escape==='global')db.prepare('UPDATE game_settings SET boss_red_chance=boss_red_chance+1 WHERE id=1').run();else db.prepare('UPDATE players SET gems=gems+1 WHERE id=?').run(other.id);}return result;},options);
 const payload={action:'claim_rewards',rewardTargets:[{id:'dunya-bosu-1',spawnRound:round}]};live.ws.send(JSON.stringify({type:'input',sequence:1,payload}));
 await until(()=>live.packets.some(p=>p.results?.some(r=>r.sequence===1))||s.faults.length,12000);assert(injected);assert.equal(s.faults.length,0,s.faults.map(x=>x.error?.stack).join('\n'));
 const rejected=live.packets.flatMap(p=>p.results??[]).find(r=>r.sequence===1);assert.equal(rejected.status,409,JSON.stringify(rejected));assert.equal(rejected.body.not_executed,true);assert.equal(snapshot(),before);assert.equal(world.combat.terminal,null);
 writer.sharedRefresh.run=run;live.ws.send(JSON.stringify({type:'input',sequence:2,payload}));await until(()=>live.packets.some(p=>p.results?.some(r=>r.sequence===2))||s.faults.length,12000);assert.equal(s.faults.length,0,s.faults.map(x=>x.error?.stack).join('\n'));const paid=live.packets.flatMap(p=>p.results??[]).find(r=>r.sequence===2);assert.equal(paid.status,200,JSON.stringify(paid));assert.equal(paid.body.processed,1);assert.equal(sql.prepare('SELECT COUNT(*) n FROM boss_reward_claims').get().n,1);
});

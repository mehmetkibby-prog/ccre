import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {BASE,hash,native} from './helpers.mjs';
import {originalNotificationViews} from './notification-oracle.mjs';
import {notificationViews,captureNotificationVisibility,resolveNativeNotificationRecipients} from '../notification-audience.mjs';
import {EventFanout} from '../event-fanout.mjs';
import {NotificationOutbox} from '../notification-outbox.mjs';
import {ChannelOwnership,registerOwnedRule} from '../ownership.mjs';
import {setupPvp,put} from './pvp-fixture.mjs';
const {installRegistry}=await native('vds-server/src/loadlab/registry.mjs');
const clock=()=>100000,rows=map=>[...map].sort((a,b)=>a[0].localeCompare(b[0]));
const actor=(id,channel=1,area='forest',arena='')=>({id,world_cycle:1,channel,area,arena_match_id:arena,is_gm:0,gm_invisible:0,hp:100,hpRevision:1});
const loss=id=>({type:'pvp_gem_loss479',targetId:id,eventId:'pvp-gems479:'+id+':2',hpRevision:2,pvpGemsLost479:5});

test('native original publishers and senders agree on four-channel rooms, arena isolation, private cross-scope and GM audiences',async()=>{
 installRegistry({now:clock});const proof=JSON.parse(fs.readFileSync(new URL('../generated/notification-proof.json',import.meta.url)));assert.equal(proof.bodies.length,9);assert.equal(hash(fs.readFileSync(new URL('../generated/notification-rules.mjs',import.meta.url))),proof.generatedSha256);for(const b of proof.bodies){const source=fs.readFileSync(path.join(BASE,b.file),'utf8');assert.equal(hash(source.slice(b.start,b.end)),b.sha256);}
 let count=0;
 for(const channel of [1,2,3,4])for(const area of ['forest','arena','guild_hall_native-1'])for(const conceal of [false,true]){
  const players=[actor('a',channel,area,'arena-match-1'),actor('b',channel,area,'arena-match-1'),actor('other-channel',channel===4?1:channel+1,area,'arena-match-1'),actor('other-room',channel,'fishing'),actor('other-match',channel,'arena','arena-match-2'),{...actor('other-cycle',channel,area,'arena-match-1'),world_cycle:2}];players[0].is_gm=1;players[0].gm_invisible=Number(conceal);
  for(const event of [{type:'monster_result',attackerId:'a',targetId:'monster',hp:12,attackerGems:90},{type:'player_state',targetId:'a',hp:40,hpRevision:2},{type:'pvp_result',attackerId:'b',targetId:'a',hp:30,hpRevision:2},{type:'guardian_control',actorId:'a',targetId:'monster',targetKind:'monster',moved:{x:900,y:800},controlled:{x:1100,y:800},from:{x:1,y:2},to:{x:3,y:4}}]){
   const route={cycle:1,channels:[channel],area,arena:area==='arena'?'arena-match-1':null,event},expected=rows(await originalNotificationViews(route,players,{clock}));assert.deepEqual(rows(notificationViews(route,players,{clock})),expected);assert.deepEqual(rows(notificationViews(route,players,{clock,immutableEvents:true})),expected);assert.deepEqual([...notificationViews(route,players,{clock,recipientsOnly:true}).keys()].sort(),expected.map(r=>r[0]).sort());count++;
  }
  const route={cycle:1,channels:[channel],area,arena:'arena-match-1',actors:['b','other-channel','b','bad/id'],event:{type:'party_invite',eventId:'native-invite'}};assert.deepEqual(rows(notificationViews(route,players,{clock})),rows(await originalNotificationViews(route,players,{clock})));count++;
 }
 assert.equal(count,120);
 const privateRoute={cycle:1,channels:[1],area:'arena',arena:'arena-match-1',actors:['victim'],event:loss('victim')},players=[actor('victim',4,'bazaar'),actor('observer',4,'bazaar')];assert.deepEqual(rows(notificationViews(privateRoute,players,{clock})),rows(await originalNotificationViews(privateRoute,players,{clock})));assert.deepEqual([...notificationViews(privateRoute,players,{clock}).keys()],['victim']);
 const fanout=new EventFanout({channel:4,cycle:()=>1,players:new Map(players.map(p=>[p.id,p])),connected:()=>true});assert.equal(fanout.visible(privateRoute,'victim').pvpGemsLost479,5);assert.equal(fanout.visible(privateRoute,'observer'),null);
 const world={cycle:1,rooms:[{channel:1,area:'forest'}],event:{type:'chat_message',chatScope:'world',cycle:1,eventId:'chat-message:7',message:{id:7,scope:'world',recipient_id:null,area:null,player_id:'victim',player_name:'Victim',body:'Native world message',channel:4,created_at:100}}};assert.deepEqual(rows(notificationViews(world,players,{clock})),rows(await originalNotificationViews(world,players,{clock})));assert.equal(notificationViews(world,players,{clock}).size,2);
});

test('nested audience calls and failures never share borrowed scratch or mutate prior returned events',()=>{
 const players=[actor('pool-one',4),actor('pool-two',4)],route={cycle:1,channels:[4],area:'forest',event:{type:'monster_result',targetId:'mob',hp:10}},before=notificationViews(route,players,{clock}),expected=rows(before);let nested=false;
 const actual=notificationViews(route,players,{clock,hidden:()=>{if(!nested){nested=true;assert.throws(()=>notificationViews({cycle:1,event:{}},players,{clock}),/notification_scope/);assert.equal(notificationViews({...route,channels:[3]},players,{clock}).size,0);}return false;}});
 assert(nested);assert.equal(actual.size,2);assert.deepEqual(rows(actual),expected);assert.deepEqual(rows(before),expected);assert.deepEqual(rows(notificationViews(route,players,{clock})),expected);
});

test('hot event fanout follows live scope, connections and GM changes while shared nested payloads stay immutable',()=>{
 installRegistry({now:clock});let cycle=1;const connected=new Set(['owner','observer']),players=new Map([['owner',actor('owner',4)],['observer',actor('observer',4)]]),fanout=new EventFanout({channel:4,cycle:()=>cycle,players,connected:id=>connected.has(id)});
 const route={cycle:1,channels:[4],area:'forest',event:{type:'guardian_control',actorId:'owner',targetId:'monster',targetKind:'monster',moved:{x:900,y:800},controlled:{x:1100,y:800},serverAt:100000}};
 const check=()=>{const expected=notificationViews(route,[...players.values()].filter(p=>connected.has(p.id)).map(p=>({...p,world_cycle:cycle})),{clock,hidden:id=>players.get(id)?.is_gm===1&&players.get(id)?.gm_invisible===1});fanout.receive(route);for(const id of players.keys()){const got=fanout.take(id);assert.deepEqual(got,expected.has(id)?[expected.get(id)]:[]);if(got.length){assert(Object.isFrozen(got[0]));if(got[0].moved)assert.throws(()=>{got[0].moved.x=0;},TypeError);}}};
 check();players.set('owner',{...players.get('owner'),is_gm:1,gm_invisible:1});check();players.set('observer',{...players.get('observer'),channel:3});check();players.set('observer',{...players.get('observer'),channel:4,area:'arena',arena_match_id:'arena-other-1'});check();connected.delete('owner');check();cycle=2;check();
});

test('native lab audience, payload caps and private world instance never widen to another player',async()=>{
 const {registry}=installRegistry({now:clock}),snapshot=registry.snapshot();registry.apply({...snapshot,generation:1,enabled:true,windowExpiresAtMs:200000,runs:[{id:'cohort-one',status:'running',expiresAtMs:200000,heartbeatUntilMs:200000,bots:[{id:'bot-one',accountId:'bot-account',channel:4,area:'forest'}],monsters:['lab-monster']}]});
 const players=[actor('bot-one',4),actor('observer',4)],route={cycle:1,channels:[4],area:'forest',event:{type:'monster_result',attackerId:'bot-one',targetId:'lab-monster',hp:10}};
 assert.deepEqual(rows(notificationViews(route,players,{clock})),rows(await originalNotificationViews(route,players,{clock})));assert.deepEqual([...notificationViews(route,players,{clock}).keys()],['bot-one']);registry.deny();assert.equal(notificationViews(route,players,{clock}).size,0);installRegistry({now:clock});
 const privateRoute={cycle:1,channels:[4],area:'forest',actors:['bot-one'],event:{type:'world_delta',protocol:'world-delta-v1',cycle:1,seq:1,epoch:'native-epoch',instanceId:'new-instance',channel:4,area:'forest',room:JSON.stringify([1,4,'forest',''])}};
 for(const instanceId of ['old-instance','new-instance']){const current=[{...players[0],instanceId}];assert.deepEqual(rows(notificationViews(privateRoute,current,{clock})),rows(await originalNotificationViews(privateRoute,current,{clock})));assert.equal(notificationViews(privateRoute,current,{clock}).size,Number(instanceId==='new-instance'));}
 const tooLarge={cycle:1,channels:[4],area:'forest',event:{type:'monster_result',text:'x'.repeat(24000)}};assert.equal(notificationViews(tooLarge,players,{clock}).size,0);assert.deepEqual(rows(notificationViews(tooLarge,players,{clock})),rows(await originalNotificationViews(tooLarge,players,{clock})));
 assert.throws(()=>notificationViews({...privateRoute,event:loss('observer')},players,{clock}),/invalid_pvp_gem_loss479/);
});

test('native audience COMMIT captures exact admitted owners and concealment; replay and transfer retain only intended mailbox',async t=>{
 const s=await setupPvp(t),authority=new ChannelOwnership(s.f.database,{realmId:'notification-native'});await authority.initialize();const peers=[1,2,3,4].map(channel=>({channel,incarnation:'notification-owner-'+channel}));for(const p of peers)await authority.registerProcess(p.channel,p.incarnation);
 const template=s.sql.prepare('SELECT * FROM players WHERE id=?').get(s.id),ids=[s.id,'audience-peer','audience-other-room','audience-offline','audience-stale','audience-gm'];
 for(const [i,id]of ids.entries()){if(i)put(s.sql,'players',{...template,id,account_id:null,name:'Audience'+i});s.sql.prepare('UPDATE players SET channel=1,area=?,is_gm=?,gm_invisible=? WHERE id=?').run(i===2?'fishing':'forest',Number(i===5),Number(i===5),id);if(i!==3)await authority.admit(id,peers[0],{sessionId:'audience-session-'+i,guard:()=>true});}
 s.sql.prepare('UPDATE kernel511_admissions SET epoch=epoch+1 WHERE player_id=?').run(ids[4]);
 const box=new NotificationOutbox(s.f.database,{resolveRecipients:resolveNativeNotificationRecipients,captureRoute:captureNotificationVisibility,clock});await box.initialize();const cycle=s.sql.prepare('SELECT cycle FROM world_state').get().cycle;
 registerOwnedRule(authority,'grant',(sql,p,c)=>{sql.prepare('UPDATE players SET gems=gems+7 WHERE id=?').run(s.id);return box.append(sql,c,{events:[[cycle,1,'forest',{type:'monster_result',attackerId:ids[5],targetId:'ordinary-monster',attackerGems:999,hp:0}],[cycle,1,'arena',[ids[1]],loss(ids[1]),'arena-match-1']]});});
 const request={playerId:s.id,epoch:authority.owner(s.id).epoch,sequence:1,operation:'grant',operationId:'native-audience-once',payload:{}},ack=await authority.command(peers[0],request);assert.deepEqual(await authority.command(peers[0],request),ack);
 const audience=s.sql.prepare('SELECT actor,COUNT(*) n FROM kernel511_notification_audience GROUP BY actor ORDER BY actor').all();assert.deepEqual(audience.map(r=>[r.actor,r.n]).sort(),[[ids[0],1],[ids[1],2],[ids[5],1]].sort());
 const old=box.pending(s.sql,ids[1]);assert.equal(old.length,2);const route=old.find(m=>m.payload.event.type==='monster_result').payload;assert.deepEqual(route.concealed,[ids[5]]);
 const current=new Map([[ids[1],actor(ids[1],4,'forest')]]),fanout=new EventFanout({channel:4,cycle:()=>cycle,players:current,connected:()=>true});assert.equal(fanout.visible(route,ids[1]),null,'room event cannot follow a channel transfer');current.set(ids[1],actor(ids[1],1,'forest'));
 const visible=fanout.visible(route,ids[1]);assert.equal(visible.attackerId,'');assert.equal(visible.attackerGems,undefined,'GM logout cannot reveal a previously concealed attacker');
 current.set(ids[1],actor(ids[1],4,'bazaar'));assert.equal(fanout.visible(old.find(m=>m.payload.event.type==='pvp_gem_loss479').payload,ids[1]).pvpGemsLost479,5);
 await assert.rejects(s.f.database.atomic(sql=>{box.append(sql,{realm:'notification-native',key:'rollback'},{events:[[cycle,1,'forest',{type:'monster_result',hp:0}]]});throw Error('rollback');}),/rollback/);assert.equal(s.sql.prepare('SELECT COUNT(*) n FROM kernel511_notifications').get().n,2);
});

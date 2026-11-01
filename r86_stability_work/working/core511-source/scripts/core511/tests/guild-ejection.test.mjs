import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {BASE,native,hash,temporary} from './helpers.mjs';
import {setupPvp,put,update,json} from './pvp-fixture.mjs';
import {prepareModeCase,captureModes,withNativeModeOracle} from './mode-fixture.mjs';
import {bindGuildEjection} from './guild-ejection-fixture.mjs';
import {SessionMirror} from '../session-mirror.mjs';
import {nativeNotification} from '../notification-outbox.mjs';

async function fixture(t){
 const s=await setupPvp(t);s.reset({area:'forest'});const payload=await prepareModeCase(s,'guild_village','revoke'),{hallArea}=await native('lib/guild-village.mjs');update(s.sql,'players',s.targetId,{area:hallArea('mode-guild')});update(s.sql,'players','rival-extra',{area:hallArea('mode-guild')});put(s.sql,'guild_members',{player_id:'rival-extra',guild_id:'mode-guild',joined_at:1});
 const writer=await bindGuildEjection(s.f.database,s.nowMs),peer={channel:1,incarnation:'guild-ejection-owner'};await writer.register(peer);const owner=await writer.admit(s.id,peer,{sessionId:'guild-ejection-session',guard:()=>true});await writer.admit('rival-extra',peer,{sessionId:'guild-ejection-observer',guard:()=>true});
 const request={playerId:s.id,epoch:owner.epoch,sequence:1,operationId:'guild-ejection-once',operation:'mode_action',payload:{...payload,resources:['player:'+s.id]}};
 return {...s,payload,request,writer,peer};
}

test('native guild revoke preserves full original act/repairAll rows and old-hall ejection publication in one receipt',async t=>{
 const s=await fixture(t),proof=JSON.parse(fs.readFileSync(new URL('../generated/guild-ejection-proof.json',import.meta.url))),source=fs.readFileSync(path.join(BASE,proof.file),'utf8');assert.equal(hash(source),proof.sourceSha256);assert.equal(hash(fs.readFileSync(new URL('../generated/guild-ejection-rules.mjs',import.meta.url))),proof.generatedSha256);for(const b of proof.bodies)assert.equal(hash(source.slice(b.start,b.end)),b.sha256);
 const b=proof.bodies.find(b=>b.name==='publishGuildEjections'),events=[],publisher=new Function('game_world_exports','realtime_room_exports','Date',source.slice(b.start,b.end)+';return publishGuildEjections;')({db:()=>s.db},{publishRealtimeRoomEvent:(...args)=>{events.push(args);}},{now:()=>s.nowMs}),{createGuildVillage}=await native('vds-server/src/guild-village.mjs');
 s.sql.exec('SAVEPOINT native_guild_ejection_oracle');const expected=withNativeModeOracle(s,db=>{const service=createGuildVillage(db,{now:()=>s.nowMs,dungeonLocked:()=>false});return {result:service.act(s.id,s.payload.input),ejections:service.repairAll()};});await publisher(expected.ejections);const rows=captureModes(s.sql);s.sql.exec('ROLLBACK TO native_guild_ejection_oracle;RELEASE native_guild_ejection_oracle');
 const ack=await s.writer.command(s.peer,s.request);assert.deepEqual(ack.result.result,expected.result);assert.deepEqual(ack.result.events,[]);assert.deepEqual(s.sql.prepare('SELECT payload FROM kernel511_notifications ORDER BY ordinal').all().map(r=>JSON.parse(r.payload)),events.map(nativeNotification));assert.deepEqual(captureModes(s.sql),rows);assert.deepEqual(ack.result.players.map(p=>p.id).sort(),[s.id,s.targetId].sort());assert.equal(events.length,1);assert.equal(events[0][3].type,'player_respawn');assert.equal(events[0][3].playerId,s.targetId);
 const audience=s.sql.prepare('SELECT actor FROM kernel511_notification_audience').all().map(r=>r.actor);assert.deepEqual(audience,['rival-extra']);assert.deepEqual(json(await s.writer.command(s.peer,s.request)),json(ack));assert.deepEqual(captureModes(s.sql),rows);assert.equal(s.sql.prepare('SELECT COUNT(*) n FROM kernel511_notifications').get().n,1);
});

test('rejected native revoke cannot eject a guest or publish a phantom repair',async t=>{
 const s=await fixture(t);update(s.sql,'guilds','mode-guild',{leader_id:'rival-extra'});const before=captureModes(s.sql),ack=await s.writer.command(s.peer,s.request);assert.equal(ack.result.result.ok,false);assert.deepEqual(ack.result.events,[]);assert.deepEqual(captureModes(s.sql),before);assert.equal(s.sql.prepare('SELECT COUNT(*) n FROM kernel511_notifications').get().n,0);
});

test('cached native guild deadline expires only its exact hall and never extends central authentication',async t=>{
 const s=await fixture(t),{hallArea,villageArea}=await native('lib/guild-village.mjs');let time=s.nowMs;const player={area:hallArea('mode-guild')},peer={channel:1,incarnation:'guild-deadline-owner'},owner={...peer,epoch:1},identity={actor:s.targetId,account:'guild-account',session:'guild-session',epoch:1,securityVersion:2},access=()=>{const d=s.writer.services.globals.__colGuildVillage.deadline(s.targetId,player.area);return {area:player.area,deadlineMs:Number.isFinite(d)?d:null};};let cached=access();
 const mirror=new SessionMirror({peer,owner:()=>owner,player:()=>player,guildAccess:()=>cached,clock:()=>time});mirror.update({...identity,revision:1,channel:peer.channel,incarnation:peer.incarnation,accountVersion:2,sessionExpiresMs:time+10000000,securityValidUntil:time+3000000,botDueMs:time+10000000,blocked:false,canPlay:true,maintenanceAllowed:true,realmOpen:true,guildDeadlineMs:null});
 const prepare=s.sql.prepare;s.sql.prepare=()=>assert.fail('hot guild guard used SQL');try{assert.equal(mirror.check(identity),true);time=cached.deadlineMs;assert.equal(mirror.check(identity).code,'guild_access_expired');player.area=hallArea('other-hall');assert.equal(mirror.check(identity).code,'guild_access_expired');}finally{s.sql.prepare=prepare;}
 player.area=villageArea(1);cached=access();assert.equal(cached.deadlineMs,null);assert.equal(mirror.check(identity),true);time=s.nowMs+3000000;assert.equal(mirror.check(identity).code,'security_verification_required');
});

test('actual guild revoke writer SIGKILL on both COMMIT sides keeps invitation, ejection and notification atomic',{timeout:20000},async t=>{
 const s=await fixture(t),dir=temporary(t),input=path.join(dir,'input.json');fs.writeFileSync(input,JSON.stringify({peer:s.peer,request:s.request}));s.sql.exec('PRAGMA wal_checkpoint(TRUNCATE)');const {LocalDatabase}=await native('vds-server/src/database.mjs');
 for(const phase of ['before','after']){
  const file=path.join(dir,phase+'.sqlite'),marker=path.join(dir,phase+'.marker');fs.copyFileSync(s.f.file,file);const child=spawn(process.execPath,[path.join(import.meta.dirname,'guild-ejection-crash-fixture.mjs'),file,input,phase,marker],{stdio:['ignore','ignore','pipe']});let stderr='';child.stderr.on('data',b=>stderr+=b);const [code,signal]=await once(child,'exit');assert.equal(signal,'SIGKILL',stderr);assert.equal(code,null);assert.equal(fs.readFileSync(marker,'utf8'),phase==='before'?'uncommitted_native_guild_ejection':'durable_native_guild_ejection_before_ack');
  const database=new LocalDatabase(file,{groupWrites:true,asyncDurable:true});try{const writer=await bindGuildEjection(database,s.nowMs),sql=database.sqlite,read=()=>json({invited:!!sql.prepare('SELECT 1 FROM guild_castle_guests WHERE player_id=?').get(s.targetId),area:sql.prepare('SELECT area FROM players WHERE id=?').get(s.targetId).area,receipts:sql.prepare('SELECT COUNT(*) n FROM kernel511_channel_receipts').get().n,notices:sql.prepare('SELECT COUNT(*) n FROM kernel511_notifications').get().n});let state=read();assert.equal(state.invited,phase==='before');assert.equal(state.area.startsWith('guild_hall_'),phase==='before');assert.equal(state.receipts,phase==='after'?1:0);assert.equal(state.notices,phase==='after'?1:0);const ack=await writer.command(s.peer,s.request);state=read();assert.equal(state.invited,false);assert.equal(state.area,'guild_village_1');assert.equal(state.receipts,1);assert.equal(state.notices,1);assert.deepEqual(json(await writer.command(s.peer,s.request)),json(ack));assert.deepEqual(read(),state);}finally{database.close();}
 }
});

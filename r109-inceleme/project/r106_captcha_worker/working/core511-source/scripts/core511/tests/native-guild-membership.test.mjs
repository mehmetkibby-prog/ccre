import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {parse} from '../../perf-r11/tests/parser.mjs';
import {native,temporary,hash} from './helpers.mjs';
import {setupPvp,update,json} from './pvp-fixture.mjs';
import {prepareModeCase,captureModes} from './mode-fixture.mjs';
import {nativeAdminSource} from './native-admin-fixture.mjs';
import {standaloneRevoke} from './native-guild-village-unit-fixture.mjs';
import {membershipOracle} from './native-guild-membership-fixture.mjs';
import {nativeGuildEjections} from '../generated/guild-ejection-rules.mjs';
import {nativeNotification} from '../notification-outbox.mjs';
import {createNativeGuildMembership} from '../generated/native-guild-membership.mjs';
import {patchNativeGuildMembership} from '../patch-native-guild-membership.mjs';
import {patchNativeGuildConfiguration} from '../patch-native-guild-configuration.mjs';
import {patchNativeGuildVillage} from '../patch-native-guild-village.mjs';
import {patchNativeAdmin} from '../patch-native-admin.mjs';
import {patchNativeAuth} from '../patch-native-auth.mjs';
import {patchNativeLogout} from '../patch-native-logout.mjs';
import {patchNativeSession} from '../patch-native-session.mjs';
import {patchNativePresence} from '../patch-native-presence.mjs';
import {patchNativeBootstrap} from '../patch-native-bootstrap.mjs';
import {patchNativeConfiguration} from '../patch-native-configuration.mjs';
import {patchNativeRuneConfiguration} from '../patch-native-rune-configuration.mjs';
import {patchNativeWorldStartup} from '../patch-native-world-startup.mjs';
import {patchNativeGuildAuth} from '../patch-native-guild-auth.mjs';

async function fixture(t){
 const s=await setupPvp(t);s.reset({area:'forest'});await prepareModeCase(s,'guild_village','revoke');update(s.sql,'players',s.targetId,{area:'guild_hall_mode-guild'});s.sql.prepare('DELETE FROM guild_castle_guests WHERE player_id=?').run(s.targetId);
 for(const id of [s.id,s.targetId])s.sql.prepare('INSERT INTO guild_members(player_id,guild_id,joined_at) VALUES(?,?,1) ON CONFLICT(player_id) DO UPDATE SET guild_id=excluded.guild_id').run(id,'mode-guild');
 s.sql.function('strftime',{varargs:true},pattern=>{assert.equal(pattern,'%s');return String(Math.floor(s.nowMs/1000));});return {...s,...await standaloneRevoke(s.f.database,s.nowMs)};
}
const actionBody=(s,action)=>action==='disband'?{action,id:'mode-guild',name:'Core guild'}:action==='kick'?{action,target:s.targetId}:{action};

test('native guild membership extraction and three route edits preserve original cases and thirteen-patch composition',()=>{
 const file=path.join(import.meta.dirname,'../generated/native-guild-membership.mjs'),generated=fs.readFileSync(file,'utf8'),proof=JSON.parse(fs.readFileSync(file.replace('.mjs','-proof.json'),'utf8'));assert.equal(hash(generated),proof.generatedSha256);assert.equal(hash(nativeAdminSource),proof.sourceSha256);
 for(const row of [...proof.declarations,...proof.cases,...proof.eventDeclarations,...proof.audience])assert.equal(hash(nativeAdminSource.slice(row.start,row.end)),row.sha256);
 for(const row of proof.cases)assert(generated.includes(nativeAdminSource.slice(row.start,row.end).replaceAll('await ','')),row.action);
 const result=patchNativeGuildMembership(nativeAdminSource);assert.equal(result.proof.edits.length,3);let restored=result.source;for(const e of result.proof.edits)restored=restored.replace(e.replacement,e.original);assert.equal(restored,nativeAdminSource);assert.throws(()=>patchNativeGuildMembership(result.source),/native_guild_membership_route_changed/);
 const patches=[patchNativeAdmin,patchNativeAuth,patchNativeLogout,patchNativeSession,patchNativePresence,patchNativeBootstrap,patchNativeConfiguration,patchNativeRuneConfiguration,patchNativeWorldStartup,patchNativeGuildAuth,patchNativeGuildVillage,patchNativeGuildConfiguration,patchNativeGuildMembership],apply=list=>list.reduce((s,p)=>p(s).source,nativeAdminSource);assert.equal(apply(patches),apply(patches.toReversed()));
});

test('guild notification capture preserves the original dedicated audience deduplication and native eighty-player limit',async()=>{
 const ast=parse(nativeAdminSource,{ecmaVersion:'latest',sourceType:'module'}),node=ast.body.find(n=>n.id?.name==='publishRealtimeGuildEvent'),code=nativeAdminSource.slice(node.start,node.end)+'\npublishRealtimeGuildEvent',rules=createNativeGuildMembership();
 for(const [count,type,duplicate] of [[0,'guild_changed',false],[1,'guild_changed',false],[80,'guild_changed',false],[81,'guild_changed',false],[2,'guild_changed',true],[1,'other',false]]){
  const players=Array.from({length:count},(_,i)=>({id:'member-'+(duplicate?0:i),channel:i%4+1,area:'forest',arena_match_id:''})),event={type,eventId:'guild-event-123',serverAt:1000},nativeEvents=[],actual=[];
  const original=vm.runInNewContext(code,{realtimeRoomName:(...a)=>JSON.stringify(a),publishDurableRoomEvent:async()=>false,hasRealtimeSigningKey:()=>true,deliverDedicatedEvent:async(url,body,signed)=>{assert.equal(url,'/internal/broadcast-players');assert.equal(signed,true);nativeEvents.push(JSON.parse(body));return true;}});
  const expected=await original(1,players,event),value=rules.captureGuildEvent(1,players,event,(cycle,channel,area,ids,message)=>{actual.push({v:1,cycle,audiencePlayerIds:ids,event:message});return true;});assert.equal(Boolean(value),expected);assert.deepEqual(actual,nativeEvents);
 }
});

for(const name of ['leave','kick','disband','kick-guest'])test('native guild '+name+' preserves original full SQL rows, reply, repair and private recipients',async t=>{
 const s=await fixture(t),action=name==='kick-guest'?'kick':name,body=actionBody(s,action),actor=action==='leave'?s.targetId:s.id,uuid=()=> '11111111-2222-4333-8444-555555555555',clock=()=>s.nowMs,events=[],guild=[];if(name==='kick-guest')s.sql.prepare('INSERT INTO guild_castle_guests VALUES(?,?,?,?)').run('mode-guild',s.targetId,s.id,Math.floor(s.nowMs/1000)+1800);
 const original=membershipOracle({clock,uuid,publish:(...args)=>guild.push(args)});s.adapter.membershipRules=createNativeGuildMembership({clock,uuid});let expected,rows;s.sql.exec('SAVEPOINT native_membership_oracle');
 try{expected=await original.action(s.db,actor,body);nativeGuildEjections(s.core.guild.repairAll(),{db:()=>s.db,publishRealtimeRoomEvent:(...args)=>events.push(args),now:clock});await original.changed(s.db,actor,body,expected);rows=captureModes(s.sql);}finally{s.sql.exec('ROLLBACK TO native_membership_oracle;RELEASE native_membership_oracle');}
 assert.equal(guild.length,1);const result=await s.adapter.membership(s.core.guild,actor,body);assert.deepEqual(json(result),json(expected));assert.deepEqual(captureModes(s.sql),rows);
 const notices=s.sql.prepare('SELECT payload FROM kernel511_notifications ORDER BY ordinal').all().map(r=>JSON.parse(r.payload)),privateEvent=notices.pop();assert.deepEqual(notices,events.map(nativeNotification));assert.equal(privateEvent.cycle,guild[0][0]);assert.deepEqual(privateEvent.event,json(guild[0][2]));assert.deepEqual(privateEvent.actors,json([...new Set(guild[0][1].map(p=>p.id))]));
 if(name==='kick-guest')assert.equal(s.sql.prepare('SELECT area FROM players WHERE id=?').get(s.targetId).area,'guild_hall_mode-guild');
 const committed=captureModes(s.sql),count=s.sql.prepare('SELECT COUNT(*) n FROM kernel511_notifications').get().n;await assert.rejects(s.adapter.membership(s.core.guild,actor,body));assert.deepEqual(captureModes(s.sql),committed);assert.equal(s.sql.prepare('SELECT COUNT(*) n FROM kernel511_notifications').get().n,count);
});

test('native membership rule rejection preserves original error and leaves all SQL rows and notifications unchanged',async t=>{
 const s=await fixture(t),original=membershipOracle({clock:()=>s.nowMs,uuid:()=>crypto.randomUUID(),publish:()=>{}}),before=captureModes(s.sql);
 for(const [actor,body]of [[s.targetId,{action:'kick',target:s.id}],[s.id,{action:'leave'}],[s.id,{action:'disband',id:'mode-guild',name:'Wrong name'}],[s.id,{action:'disband'}],[s.id,{action:'kick',target:'missing-member'}]]){
  let error;s.sql.exec('SAVEPOINT native_member_reject');try{await original.action(s.db,actor,body);}catch(e){error=e;}finally{s.sql.exec('ROLLBACK TO native_member_reject;RELEASE native_member_reject');}assert(error);await assert.rejects(s.adapter.membership(s.core.guild,actor,body),e=>e.message===error.message);assert.deepEqual(captureModes(s.sql),before);assert.equal(s.sql.prepare('SELECT COUNT(*) n FROM kernel511_notifications').get().n,0);assert.equal(s.sql.isTransaction,false);
 }
 await assert.rejects(s.adapter.membership(s.core.guild,s.id,{action:'unknown_guild_action'}),{code:'native_guild_membership_scope'});
});

test('sole writer SIGKILL on both native disband COMMIT sides retains cascades, repairs and one guild notification',{timeout:20000},async t=>{
 const s=await fixture(t),dir=temporary(t),input=path.join(dir,'input.json'),body=actionBody(s,'disband');fs.writeFileSync(input,JSON.stringify({kind:'membership',id:s.id,body,nowMs:s.nowMs}));s.sql.exec('PRAGMA wal_checkpoint(TRUNCATE)');const {LocalDatabase}=await native('vds-server/src/database.mjs');
 for(const phase of ['before','after']){
  const file=path.join(dir,phase+'.sqlite'),marker=path.join(dir,phase+'.marker');fs.copyFileSync(s.f.file,file);const child=spawn(process.execPath,[path.join(import.meta.dirname,'native-guild-village-crash-fixture.mjs'),file,input,phase,marker],{stdio:['ignore','ignore','pipe']});let stderr='';child.stderr.on('data',b=>stderr+=b);const [code,signal]=await once(child,'exit');assert.equal(signal,'SIGKILL',stderr);assert.equal(code,null);assert.equal(fs.readFileSync(marker,'utf8'),phase==='before'?'uncommitted_guild_membership':'durable_guild_membership_before_reply');
  const database=new LocalDatabase(file,{groupWrites:true,asyncDurable:true});try{
   const {core,adapter}=await standaloneRevoke(database,s.nowMs),sql=database.sqlite,read=()=>json({guild:sql.prepare("SELECT * FROM guilds WHERE id='mode-guild'").get()??null,castle:sql.prepare("SELECT * FROM guild_castles WHERE guild_id='mode-guild'").get()??null,members:sql.prepare("SELECT * FROM guild_members WHERE guild_id='mode-guild' ORDER BY player_id").all(),member:sql.prepare('SELECT area,position_revision,hp_revision FROM players WHERE id=?').get(s.targetId),notices:sql.prepare('SELECT payload FROM kernel511_notifications ORDER BY ordinal').all().map(r=>JSON.parse(r.payload))}),before=read();assert.equal(before.guild===null,phase==='after');assert.equal(before.castle===null,phase==='after');assert.equal(before.members.length,phase==='before'?2:0);assert.equal(before.member.area,phase==='before'?'guild_hall_mode-guild':'guild_village_1');assert.equal(before.notices.length,phase==='before'?0:2);
   if(phase==='before')await adapter.membership(core.guild,s.id,body);else{await assert.rejects(adapter.membership(core.guild,s.id,body));assert.deepEqual(read(),before);}const after=read();assert.equal(after.guild,null);assert.equal(after.castle,null);assert.equal(after.members.length,0);assert.equal(after.member.area,'guild_village_1');assert.equal(after.notices.length,2);assert.deepEqual(after.notices.map(n=>n.event.type),['player_respawn','guild_changed']);
  }finally{database.close();await database.walSync?.closing;}
 }
});

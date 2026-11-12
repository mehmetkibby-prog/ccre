import test from 'node:test';
import assert from 'node:assert/strict';
import {setupEntry} from './entry-fixture.mjs';
import {put,update} from './pvp-fixture.mjs';
import {until} from './helpers.mjs';
import {ChannelOwnership} from '../ownership.mjs';
import {GamePresenceBridge} from '../game-presence.mjs';
import {createNativeEntryAuth} from '../entry-writer.mjs';
import {createRetaliationRules} from '../generated/retaliation-rules.mjs';
import {createEntryRules} from '../generated/entry-rules.mjs';
import {attackRandom} from '../attack-writer.mjs';

test('original entry auth retains cookie digest, Origin, CSRF, instance, version, ban, bot and realm predicates',async t=>{
 const s=await setupEntry(t),{sql,id,account,auth,request}=s;
 const session=await auth.session(request());assert.equal(session.tokenHash,s.tokenHash);assert.equal(session.player.id,id);
 const denied=async(req,code,status)=>{await assert.rejects(auth.session(req),e=>e.code===code&&e.status===status);};
 await denied(request({headers:{Cookie:''}}),'authentication_required',401);
 await denied(request({headers:{Origin:'https://other.invalid'}}),'invalid_origin',403);
 await denied(request({headers:{'X-CSRF-Token':'c'.repeat(40)}}),'invalid_csrf',403);
 await denied(request({headers:{'X-Game-Instance':'00000000-0000-0000-0000-000000000000'}}),'game_instance_expired',409);
 sql.prepare('UPDATE accounts SET security_version=security_version+1,permanently_banned=1 WHERE id=?').run(account.id);
 await denied(request(),'authentication_required',401);
 sql.prepare('UPDATE accounts SET security_version=security_version-1 WHERE id=?').run(account.id);await denied(request(),'account_suspended',423);
 sql.prepare('UPDATE accounts SET permanently_banned=0 WHERE id=?').run(account.id);
 sql.prepare('UPDATE bot_due SET due_ms=? WHERE account_id=?').run(s.clock(),account.id);await denied(request(),'bot_check_required',403);
 update(sql,'players',id,{area:'afk'});assert.equal((await auth.session(request())).player.id,id);update(sql,'players',id,{area:'bazaar'});
 s.globals.__colRealm={role:'accounts'};await denied(request(),'realm_required',403);
});

test('native live presence never resurrects replaced, removed, expired-security or retired ownership sessions',async t=>{
 const s=await setupEntry(t),session=await s.auth.session(s.request()),peer={channel:1,incarnation:'presence-native'},owner={player_id:s.id,...peer,epoch:1,admitted:true,state:'active'};let secure=true;
 const bridge=new GamePresenceBridge({owner:()=>owner,security:()=>secure,clock:s.clock});bridge.admit(session,owner);
 const auth=createNativeEntryAuth({database:s.db,globals:s.globals,clock:s.clock,presence:bridge}),identity={actor:s.id,account:s.account.id,session:s.tokenHash,epoch:1};
 s.setTime(s.clock()+39000);bridge.seen(peer,identity);s.setTime(s.clock()+2000);assert.equal((await auth.session(s.request())).player.id,s.id);
 secure=false;await assert.rejects(auth.session(s.request()),e=>e.code==='game_instance_expired');secure=true;
 owner.epoch++;await assert.rejects(auth.session(s.request()),e=>e.code==='game_instance_expired');owner.epoch--;
 s.sql.prepare("UPDATE game_presence SET instance_id='replaced' WHERE account_id=?").run(s.account.id);await assert.rejects(auth.session(s.request()),e=>e.code==='game_instance_expired');
 s.sql.prepare('DELETE FROM game_presence WHERE account_id=?').run(s.account.id);await assert.rejects(auth.session(s.request()),e=>e.code==='game_instance_expired');
 s.sql.prepare('DELETE FROM auth_sessions WHERE token_hash=?').run(s.tokenHash);await assert.rejects(auth.session(s.request()),e=>e.code==='authentication_required');
});

test('native join and starter ledger share admission COMMIT and fsync; duplicate admission does not rerun rewards',async t=>{
 const s=await setupEntry(t),a=new ChannelOwnership(s.f.database,{realmId:'entry-native',now:s.clock});await a.initialize();const peer={channel:4,incarnation:'entry-four'};await a.registerProcess(4,peer.incarnation);
 // Existing native launch schema determines eligibility; this fixture only
 // chooses dates, never substitutes the starter ledger implementation.
 s.sql.prepare('UPDATE launch_settings SET registration_at=?,opens_at=? WHERE id=1').run((s.account.created_at-1)*1000,(s.account.created_at+1)*1000);
 const session=await s.auth.session(s.request());let result,calls=0;
 const options={sessionId:s.tokenHash,guard:()=>true,prepare:sql=>{calls++;return result=s.entry.prepare(sql,{session,channel:4});}};
 const durable=s.f.database.durableAfterCommit.bind(s.f.database);let release;const hold=new Promise(r=>release=r);s.f.database.durableAfterCommit=()=>Promise.resolve(durable()).then(()=>hold);t.after(()=>release());
 let settled=false;const pending=a.admit(s.id,peer,options).then(v=>{settled=true;return v;});await until(()=>!!a.admission(s.id));assert.equal(settled,false);assert.equal(result.accepted,true);
 assert.equal(s.sql.prepare('SELECT channel FROM players WHERE id=?').get(s.id).channel,4);assert.equal(s.sql.prepare('SELECT COUNT(*) n FROM prereg_rewards WHERE account_id=?').get(s.account.id).n,1);
 release();const owner=await pending;s.f.database.durableAfterCommit=durable;assert.equal(owner.channel,4);await a.admit(s.id,peer,options);assert.equal(calls,1);
});

test('lethal incoming native damage commits when join rejects, without admission or starter reward',async t=>{
 const s=await setupEntry(t),a=new ChannelOwnership(s.f.database,{realmId:'entry-death',now:s.clock});await a.initialize();const peer={channel:4,incarnation:'entry-death-four'};await a.registerProcess(4,peer.incarnation);
 update(s.sql,'players',s.id,{area:'forest',x:2700,y:2025,hp:1,channel:1});const monster={id:'golge-entry-death',name:'Native entry death',area:'forest',channel:1,x:2700,y:2025,hp:100,max_hp:100,spawn_round:1,variant:'katil'};put(s.sql,'monsters',monster);
 const rules=createRetaliationRules({globals:s.globals,now:s.clock,random:()=>.99}),p=s.sql.prepare('SELECT * FROM players WHERE id=?').get(s.id);s.db.batch(rules.preparePveEngagement(s.db,p,monster,s.clock()-5000));
 const session=await s.auth.session(s.request()),result=await a.admit(s.id,peer,{sessionId:s.tokenHash,guard:()=>true,prepare:sql=>s.entry.prepare(sql,{session,channel:4,seed:'7'.repeat(64)})});
 assert.equal(result.accepted,false);assert.equal(result.result.status,409);assert.equal(s.sql.prepare('SELECT hp FROM players WHERE id=?').get(s.id).hp,0);assert.equal(a.admission(s.id),null);assert.equal(a.owner(s.id),null);assert.equal(s.sql.prepare('SELECT COUNT(*) n FROM prereg_rewards WHERE account_id=?').get(s.account.id).n,0);
});

test('native character creation matches original name, role, spawn, weapon and grant rows in one admission transaction',async t=>{
 const original=await setupEntry(t,{fresh:true}),s=await setupEntry(t,{fresh:true}),now=s.clock(),seed='4'.repeat(64);original.setTime(now);
 for(const f of [original,s])f.sql.prepare('UPDATE launch_settings SET registration_at=0,opens_at=? WHERE id=1').run(now+86400000);
 const session=await s.auth.session(s.request()),auth=await original.auth.session(original.request());assert.equal(session.player,null);
 const native=createEntryRules({environment:{DB:original.db,CORE_RUNTIME:'vds'},globals:original.globals,clock:()=>now,uuid:attackRandom(seed).uuid,response:{json:(body,{status=200}={})=>({body,status})}});
 const payload={name:'YeniKahraman',role:'avci'},expected=await native.createCharacter({auth,database:original.db,now:Math.floor(now/1000),requestReceivedAtMs:now,joinSettings:await native.getGameSettings(),payload,requestedChannel:4});assert.equal(expected.status,200);
 const authority=new ChannelOwnership(s.f.database,{realmId:'create-native',now:s.clock});await authority.initialize();const peer={channel:4,incarnation:'create-channel4'};await authority.registerProcess(4,peer.incarnation);
 const result=await s.f.database.atomic(sql=>{const created=s.entry.create(sql,{session,channel:4,payload,nowMs:now,seed});assert.equal(created.accepted,true);const owner=authority.admitIn(sql,created.session.player.id,peer,{sessionId:session.tokenHash,guard:()=>true});return {...created,owner};});
 assert.deepEqual(JSON.parse(JSON.stringify(result.result)),JSON.parse(JSON.stringify(expected)));const id=result.session.player.id;assert.equal(result.owner.player_id,id);
 for(const [table,column]of [['players','id'],['player_items','player_id'],['character_names','player_id'],['prereg_rewards','player_id']])assert.deepEqual(JSON.parse(JSON.stringify(s.sql.prepare('SELECT * FROM '+table+' WHERE '+column+'=?').all(id))),JSON.parse(JSON.stringify(original.sql.prepare('SELECT * FROM '+table+' WHERE '+column+'=?').all(id))),table);
 assert.equal(s.sql.prepare('SELECT COUNT(*) n FROM players WHERE account_id=?').get(s.account.id).n,1);assert.equal(s.sql.prepare('SELECT COUNT(*) n FROM prereg_rewards WHERE account_id=?').get(s.account.id).n,1);
});

test('native character restrictions and failed ownership commit cannot leave a partial character or starter grant',async t=>{
 const s=await setupEntry(t,{fresh:true}),session=await s.auth.session(s.request()),run=payload=>s.f.database.atomic(sql=>s.entry.create(sql,{session,channel:4,payload}));
 assert.equal((await run({name:'A',role:'avci'})).result.status,400);
 s.sql.prepare('INSERT OR IGNORE INTO blocked_words(word) VALUES(?)').run('yasakisim');assert.equal((await run({name:'Yasakisim',role:'avci'})).result.status,400);
 const taken=s.sql.prepare('SELECT name FROM players WHERE id=?').get(s.id).name;assert.equal((await run({name:taken,role:'avci'})).result.body.code,'character_name_taken');
 s.globals.__colRealm={role:'game',policy:{registrationOpen:false}};assert.equal((await run({name:'YeniKahraman'})).result.status,403);delete s.globals.__colRealm;
 const authority=new ChannelOwnership(s.f.database,{realmId:'create-rollback',now:s.clock});await authority.initialize();const peer={channel:4,incarnation:'create-rollback4'};await authority.registerProcess(4,peer.incarnation);
 await assert.rejects(s.f.database.atomic(sql=>{const created=s.entry.create(sql,{session,channel:4,payload:{name:'YeniKahraman'}});assert.equal(created.accepted,true);return authority.admitIn(sql,created.session.player.id,peer,{sessionId:session.tokenHash,guard:()=>false});}),/admission_rejected/);
 assert.equal(s.sql.prepare('SELECT COUNT(*) n FROM players WHERE account_id=?').get(s.account.id).n,0);assert.equal(s.sql.prepare('SELECT COUNT(*) n FROM prereg_rewards WHERE account_id=?').get(s.account.id).n,0);assert.equal(authority.counts().get(4)??0,0);
});

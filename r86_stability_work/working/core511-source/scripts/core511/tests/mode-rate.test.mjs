import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {parse} from '../../perf-r11/tests/parser.mjs';
import {BASE,hash,manifest,native,temporary} from './helpers.mjs';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {setupPvp,json} from './pvp-fixture.mjs';
import {prepareModeCase,captureModes,modeGlobals} from './mode-fixture.mjs';
import {NativeModeServices} from '../mode-services.mjs';
import {createModeWriterHandler} from '../mode-writer.mjs';
import {ChannelOwnership,registerOwnedRule} from '../ownership.mjs';
import {NATIVE_MODE_RATE,recordNativeSecurityEvent} from '../generated/mode-policy.mjs';
import {createEntryRules} from '../generated/entry-rules.mjs';
import {nativeTokenHash} from '../entry-writer.mjs';
import {IngressRate} from '../ingress-rate.mjs';
import {bindModeRateCrash} from './mode-rate-crash-fixture.mjs';

test('mode rate policies come from original native HTTP routes and security event body stays empty',()=>{
 const proof=JSON.parse(fs.readFileSync(new URL('../generated/mode-policy-proof.json',import.meta.url))),source=fs.readFileSync(path.join(BASE,proof.file),'utf8');assert.equal(hash(source),proof.sourceSha256);assert.equal(hash(fs.readFileSync(new URL('../generated/mode-policy.mjs',import.meta.url))),proof.generatedSha256);
 for(const b of proof.bodies)assert.equal(hash(source.slice(b.start,b.end)),b.sha256);
 for(const kind of ['rune','arena_market','battle_pass','quest','cauldron'])assert.deepEqual(NATIVE_MODE_RATE[kind],{scope:'rank-equip',options:{limit:30,windowSeconds:60,blockSeconds:5}});assert.deepEqual(NATIVE_MODE_RATE.community_claim,{scope:'community-claim',options:{limit:20,windowSeconds:60,blockSeconds:5}});assert.deepEqual(NATIVE_MODE_RATE.guild_village,{localCategory:'guild'});
 for(const file of [proof.file,'dist-vds/server/channel-runtime/index.mjs']){const text=fs.readFileSync(path.join(BASE,file),'utf8');assert.equal(hash(text),manifest.files.find(r=>r.path===file).sha256);const node=parse(text,{ecmaVersion:'latest',sourceType:'module'}).body.find(n=>n.type==='FunctionDeclaration'&&n.id.name==='recordSecurityEvent');assert.equal(node.body.body.length,0);}assert.equal(recordNativeSecurityEvent({kind:'native-rejected-movement'}),undefined);
});

test('rank modes share one native SQL limit and committed429 receipt while community keeps its separate native window',async t=>{
 const s=await setupPvp(t),first=await prepareModeCase(s,'rune','rune_craft'),services=new NativeModeServices(s.sql,{clock:()=>s.nowMs,globals:modeGlobals}),authority=new ChannelOwnership(s.f.database,{realmId:'mode-native-rate',now:()=>s.nowMs});await authority.initialize();const peer={channel:1,incarnation:'mode-native-rate-owner'};await authority.registerProcess(1,peer.incarnation);const owner=await authority.admit(s.id,peer,{sessionId:'mode-native-rate-session',guard:()=>true});
 const handler=createModeWriterHandler({services,assertOwnership:(sql,p,id,epoch)=>Boolean(authority.assertAdmitted(sql,p,id,epoch)),assertResources:()=>true});registerOwnedRule(authority,'mode_action',handler);
 const account=s.sql.prepare('SELECT account_id FROM players WHERE id=?').get(s.id).account_id,rankKey=nativeTokenHash('rank-equip:'+account),communityKey=nativeTokenHash('community-claim:'+account),now=Math.floor(s.nowMs/1000);s.sql.prepare('INSERT INTO auth_rate_limits VALUES(?,?,?,?)').run(rankKey,29,now,0);
 let sequence=0;const request=payload=>({playerId:s.id,epoch:owner.epoch,sequence:++sequence,operationId:'mode-rate-'+sequence,operation:'mode_action',payload});
 const success=await authority.command(peer,request(first));assert.notEqual(success.result.result.ok,false);assert.equal(s.sql.prepare('SELECT attempts FROM auth_rate_limits WHERE key=?').get(rankKey).attempts,30);
 const body={json:(body,{status=200,headers}={})=>({body,status,...(headers?{headers:Object.fromEntries(headers)}:{})})},original=createEntryRules({environment:{DB:s.db,CORE_RUNTIME:'vds',CORE_SHA256:nativeTokenHash},globals:services.globals,clock:()=>s.nowMs,response:body});
 s.sql.exec('SAVEPOINT native_mode_rate_oracle');let expected;try{await original.enforceRateLimit('rank-equip',account,NATIVE_MODE_RATE.rune.options);}catch(error){expected=original.authErrorResponse(error);}const expectedRate=json(s.sql.prepare('SELECT * FROM auth_rate_limits WHERE key=?').get(rankKey));s.sql.exec('ROLLBACK TO native_mode_rate_oracle;RELEASE native_mode_rate_oracle');
 const modes=[['arena_market','arena_market_wings'],['battle_pass','battle_pass_claim'],['quest','quest_claim'],['cauldron',null],['rune','rune_claim']],game=()=>{const rows=captureModes(s.sql);delete rows.auth_rate_limits;return rows;},before=game();
 for(const [kind,action]of modes){const req=request({kind,input:action?{action}:{},nowMs:s.nowMs,seed:s.seed}),ack=await authority.command(peer,req);assert.equal(ack.result.status,429);assert.deepEqual({body:ack.result.result,status:ack.result.status,headers:ack.result.headers},expected);assert.deepEqual(json(s.sql.prepare('SELECT * FROM auth_rate_limits WHERE key=?').get(rankKey)),expectedRate);assert.deepEqual(game(),before);assert.deepEqual(json(await authority.command(peer,req)),json(ack));}
 s.sql.prepare('INSERT INTO auth_rate_limits VALUES(?,?,?,?)').run(communityKey,20,now,0);const req=request({kind:'community_claim',input:{eventId:'native',stage:0},nowMs:s.nowMs,seed:s.seed}),ack=await authority.command(peer,req);assert.equal(ack.result.status,429);assert.equal(ack.result.headers['retry-after'],'5');assert.equal(s.sql.prepare('SELECT attempts FROM auth_rate_limits WHERE key=?').get(communityKey).attempts,21);assert.deepEqual(json(s.sql.prepare('SELECT * FROM auth_rate_limits WHERE key=?').get(rankKey)),expectedRate);assert.deepEqual(game(),before);assert.equal(s.sql.prepare('SELECT COUNT(*) n FROM kernel511_channel_receipts').get().n,7);
});

test('guild mode uses native local global/other counters; persistent modes do not invent another local limit',()=>{
 let now=100000;const identity={actor:'mode-player',account:'mode-account'},rates=new IngressRate({clock:()=>now}),oracle=new IngressRate({clock:()=>now});
 for(let i=0;i<125;i++)assert.equal(rates.check(identity,{action:'mode',kind:'guild_village',command:{action:i%2?'donate':'invite'}}),oracle.check(identity,{action:'guild'}));
 const snapshot=rates.snapshot(identity),next=new IngressRate({clock:()=>now});next.restore(identity,snapshot);assert.equal(next.check(identity,{action:'mode',kind:'guild_village',command:{action:'hall'}}),60);
 for(const kind of ['rune','arena_market','battle_pass','quest','cauldron','community_claim'])for(let i=0;i<35;i++)assert.equal(next.check(identity,{action:'mode',kind,command:{}}),0);assert.deepEqual(next.snapshot(identity),{...snapshot,windows:snapshot.windows.map(([k,v])=>[k,{...v,count:v.count+1}])});
 now+=60000;assert.equal(next.check(identity,{action:'mode',kind:'guild_village',command:{action:'hall'}}),0);assert.throws(()=>next.check(identity,{action:'mode',kind:'not_native',command:{}}),/mode_rate_policy/);
});

test('actual mode429 writer SIGKILL on both COMMIT sides keeps one native shared block and receipt',{timeout:20000},async t=>{
 const s=await setupPvp(t),payload=await prepareModeCase(s,'rune','rune_claim'),data={peer:{channel:1,incarnation:'mode-rate-crash-owner'},request:{playerId:s.id,epoch:1,sequence:1,operation:'mode_action',operationId:'mode-rate-crash-once',payload}},authority=bindModeRateCrash(s.f.database,data);await authority.initialize();await authority.registerProcess(1,data.peer.incarnation);const owner=await authority.admit(s.id,data.peer,{sessionId:'mode-rate-crash-session',guard:()=>true});data.request.epoch=owner.epoch;
 const account=s.sql.prepare('SELECT account_id FROM players WHERE id=?').get(s.id).account_id,key=nativeTokenHash('rank-equip:'+account),now=Math.floor(s.nowMs/1000);s.sql.prepare('INSERT INTO auth_rate_limits VALUES(?,?,?,?)').run(key,30,now,0);
 const dir=temporary(t),input=path.join(dir,'input.json');fs.writeFileSync(input,JSON.stringify(data));s.sql.exec('PRAGMA wal_checkpoint(TRUNCATE)');const {LocalDatabase}=await native('vds-server/src/database.mjs'),game=sql=>{const state=captureModes(sql);delete state.auth_rate_limits;return state;},before=game(s.sql);
 for(const phase of ['before','after']){
  const file=path.join(dir,phase+'.sqlite'),marker=path.join(dir,phase+'.marker');fs.copyFileSync(s.f.file,file);const child=spawn(process.execPath,[path.join(import.meta.dirname,'mode-rate-crash-fixture.mjs'),file,input,phase,marker],{stdio:['ignore','ignore','pipe']});let stderr='';child.stderr.on('data',b=>stderr+=b);const [code,signal]=await once(child,'exit');assert.equal(code,null,stderr);assert.equal(signal,'SIGKILL',stderr);assert.equal(fs.readFileSync(marker,'utf8'),phase==='before'?'uncommitted_mode_rate':'durable_mode_rate_before_ack');
  const db=new LocalDatabase(file,{groupWrites:true,asyncDurable:true});try{const inspect=()=>json({rate:db.sqlite.prepare('SELECT * FROM auth_rate_limits WHERE key=?').get(key),receipts:db.sqlite.prepare('SELECT COUNT(*) n FROM kernel511_channel_receipts').get().n}),initial=inspect();assert.equal(initial.rate.attempts,phase==='before'?30:31);assert.equal(initial.rate.blocked_until,phase==='before'?0:now+5);assert.equal(initial.receipts,phase==='before'?0:1);assert.deepEqual(game(db.sqlite),before);
   const recovered=bindModeRateCrash(db,data),ack=await recovered.command(data.peer,data.request);assert.equal(ack.result.status,429);const durable=inspect();assert.equal(durable.rate.attempts,31);assert.equal(durable.receipts,1);assert.equal(durable.rate.blocked_until,now+5);assert.deepEqual(json(await recovered.command(data.peer,data.request)),json(ack));assert.deepEqual(inspect(),durable);assert.deepEqual(game(db.sqlite),before);
  }finally{db.close();}
 }
});

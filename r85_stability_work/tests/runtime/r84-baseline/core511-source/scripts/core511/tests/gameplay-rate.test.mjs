import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {parse} from '../../perf-r11/tests/parser.mjs';
import {BASE,hash,native,temporary} from './helpers.mjs';
import {setupEntry} from './entry-fixture.mjs';
import {createEntryRules} from '../generated/entry-rules.mjs';
import {createNativeGameplayRates,gameplayRateResponse} from '../gameplay-rate.mjs';
import {createActionWriterHandler} from '../action-writer.mjs';
import {readAttackFrame} from '../attack-writer.mjs';
import {nativeTokenHash} from '../entry-writer.mjs';
import {ChannelOwnership,registerOwnedRule} from '../ownership.mjs';
import {bindRateCrash} from './gameplay-rate-crash-fixture.mjs';

const policies=[['fishing',{limit:20,windowSeconds:60,blockSeconds:30}],['fishing-input',{limit:480,windowSeconds:60,blockSeconds:15}],['arena-queue',{limit:20,windowSeconds:60,blockSeconds:15}]];
const json=value=>JSON.parse(JSON.stringify(value));
const response={json:(body,{status=200,headers}={})=>({body,status,...(headers?{headers:Object.fromEntries(headers)}:{})})};

test('owned gameplay rate SQL and rejection match exact native async rules across150 boundary cases',async t=>{
 const s=await setupEntry(t),file='dist-vds/server/channel-runtime/index.mjs',source=fs.readFileSync(path.join(BASE,file),'utf8'),proof=JSON.parse(fs.readFileSync(new URL('../generated/entry-proof.json',import.meta.url)));assert.equal(hash(source),proof.sourceSha256);
 const node=parse(source,{ecmaVersion:'latest',sourceType:'module'}).body.find(n=>n.type==='FunctionDeclaration'&&n.id?.name==='enforceRateLimit'),time=s.clock(),now=Math.floor(time/1000),inspect=()=>json(s.sql.prepare('SELECT * FROM auth_rate_limits ORDER BY key').all());let count=0;
 for(const [scope,policy]of policies)for(const attempts of [null,0,policy.limit-1,policy.limit,policy.limit+1])for(const [age,blocked]of [[0,0],[59,0],[60,0],[61,0],[10,now+20],[61,now+20],[0,now],[0,now-1],[86400,0],[86401,0]]){
  s.sql.prepare('DELETE FROM auth_rate_limits').run();const key=nativeTokenHash(scope+':'+s.account.id);if(attempts!==null)s.sql.prepare('INSERT INTO auth_rate_limits VALUES(?,?,?,?)').run(key,attempts,now-age,blocked);s.sql.prepare('INSERT INTO auth_rate_limits VALUES(?,?,?,?)').run('expired-other',1,now-86401,0);
  const original=createEntryRules({environment:{DB:s.db,CORE_RUNTIME:'vds',CORE_SHA256:nativeTokenHash},globals:s.globals,clock:()=>time,response});assert.equal(original.enforceRateLimit.toString(),source.slice(node.start,node.end));
  s.sql.exec('SAVEPOINT rate_oracle');let expected=null;try{await original.enforceRateLimit(scope,s.account.id,policy);}catch(error){expected=original.authErrorResponse(error);}const rows=inspect();s.sql.exec('ROLLBACK TO rate_oracle;RELEASE rate_oracle');
  const rates=createNativeGameplayRates(s.sql,{globals:s.globals,clock:()=>time});const actual=await s.f.database.atomic(sql=>{try{rates.enforce(sql,scope,s.account.id,policy);return null;}catch(error){const value=gameplayRateResponse(error);if(!value)throw error;return value;}});assert.deepEqual(actual,expected);assert.deepEqual(inspect(),rows);count++;
 }
 assert.equal(count,150);
});

test('rate rejection commits one owned429 receipt and native block; forged rate errors still roll back',async t=>{
 const s=await setupEntry(t),authority=new ChannelOwnership(s.f.database,{realmId:'rate-writer',now:s.clock});await authority.initialize();const peer={realm:'rate-writer',channel:1,incarnation:'rate-owner'};await authority.registerProcess(1,peer.incarnation);const owner=await authority.admit(s.id,peer,{sessionId:'rate-session',guard:()=>true}),key=nativeTokenHash('fishing:'+s.account.id),now=Math.floor(s.clock()/1000);s.sql.prepare('INSERT INTO auth_rate_limits VALUES(?,?,?,?)').run(key,20,now,0);
 const rates=createNativeGameplayRates(s.sql,{globals:s.globals,clock:s.clock}),dependencies={settingsFor:()=>s.settings,globalsFor:()=>s.globals,assertOwnership:(sql,p,id,epoch)=>Boolean(authority.assertAdmitted(sql,p,id,epoch)),assertResources:()=>true,affectedActors:()=>[],settleRetaliation:()=>null,enforceRateLimit:rates.enforce,clock:s.clock};
 let handler=createActionWriterHandler(dependencies);registerOwnedRule(authority,'native_action',(...args)=>handler(...args));const request={playerId:s.id,epoch:owner.epoch,sequence:1,operationId:'native-rate-rejection',operation:'native_action',payload:{input:{action:'start_fishing'},nowMs:s.clock(),receivedAtMs:s.clock(),seed:s.seed,expected:{player:readAttackFrame(s.sql,s.id,'',s.globals).player,settings:s.settings}}};
 const a=await authority.command(peer,request),rate=json(s.sql.prepare('SELECT * FROM auth_rate_limits WHERE key=?').get(key));assert.equal(a.result.result.status,429);assert.equal(a.result.result.body.code,'rate_limited');assert.equal(a.result.result.headers['retry-after'],'30');assert.equal(rate.attempts,21);assert.equal(rate.blocked_until,now+30);assert.equal(s.sql.prepare('SELECT COUNT(*) n FROM fishing_sessions WHERE player_id=?').get(s.id).n,0);assert.deepEqual(json(await authority.command(peer,request)),json(a));assert.deepEqual(json(s.sql.prepare('SELECT * FROM auth_rate_limits WHERE key=?').get(key)),rate);
 const forged=Object.assign(Error('not a native limiter rejection'),{status:429,code:'rate_limited'});handler=createActionWriterHandler({...dependencies,enforceRateLimit:()=>{s.sql.prepare('UPDATE players SET gems=gems+1 WHERE id=?').run(s.id);throw forged;}});const gems=s.sql.prepare('SELECT gems FROM players WHERE id=?').get(s.id).gems;
 await assert.rejects(authority.command(peer,{...request,sequence:2,operationId:'forged-rate'}),error=>error===forged);assert.equal(s.sql.prepare('SELECT gems FROM players WHERE id=?').get(s.id).gems,gems);assert.equal(s.sql.prepare('SELECT COUNT(*) n FROM kernel511_channel_receipts').get().n,1);assert.throws(()=>rates.enforce(s.sql,'fishing',s.account.id,policies[0][1]),{code:'gameplay_rate_requires_atomic'});
});

test('actual rate rejection writer SIGKILL before and after COMMIT preserves one block and one receipt',{timeout:20000},async t=>{
 const s=await setupEntry(t),authority=new ChannelOwnership(s.f.database,{realmId:'rate-crash',now:s.clock});await authority.initialize();const peer={realm:'rate-crash',channel:1,incarnation:'rate-crash-owner'};await authority.registerProcess(1,peer.incarnation);const owner=await authority.admit(s.id,peer,{sessionId:'rate-crash-session',guard:()=>true}),key=nativeTokenHash('fishing:'+s.account.id),now=Math.floor(s.clock()/1000);s.sql.prepare('INSERT INTO auth_rate_limits VALUES(?,?,?,?)').run(key,20,now,0);
 const request={playerId:s.id,epoch:owner.epoch,sequence:1,operationId:'rate-crash-once',operation:'native_action',payload:{input:{action:'start_fishing'},nowMs:s.clock(),receivedAtMs:s.clock(),seed:s.seed,expected:{player:readAttackFrame(s.sql,s.id,'',{}).player,settings:s.settings}}},data={request,peer,settings:s.settings},dir=temporary(t),input=path.join(dir,'input.json');fs.writeFileSync(input,JSON.stringify(data));s.sql.exec('PRAGMA wal_checkpoint(TRUNCATE)');const {LocalDatabase}=await native('vds-server/src/database.mjs');
 for(const phase of ['before','after']){
  const file=path.join(dir,phase+'.sqlite'),marker=path.join(dir,phase+'.marker');fs.copyFileSync(s.f.file,file);const child=spawn(process.execPath,[path.join(import.meta.dirname,'gameplay-rate-crash-fixture.mjs'),file,input,phase,marker],{stdio:['ignore','ignore','pipe']});let stderr='';child.stderr.on('data',b=>stderr+=b);const [code,signal]=await once(child,'exit');assert.equal(signal,'SIGKILL',stderr);assert.equal(code,null);assert.equal(fs.readFileSync(marker,'utf8'),phase==='before'?'uncommitted_rate_rejection':'durable_rate_rejection_before_ack');
  const db=new LocalDatabase(file,{groupWrites:true,asyncDurable:true});try{const {authority:recovered}=bindRateCrash(db,data),inspect=()=>json({rate:db.sqlite.prepare('SELECT * FROM auth_rate_limits WHERE key=?').get(key),receipts:db.sqlite.prepare('SELECT COUNT(*) n FROM kernel511_channel_receipts').get().n,fishing:db.sqlite.prepare('SELECT COUNT(*) n FROM fishing_sessions WHERE player_id=?').get(s.id).n});let row=inspect();assert.equal(row.rate.attempts,phase==='after'?21:20);assert.equal(row.rate.blocked_until,phase==='after'?now+30:0);assert.equal(row.receipts,phase==='after'?1:0);const ack=await recovered.command(peer,request);assert.equal(ack.result.result.status,429);row=inspect();assert.equal(row.rate.attempts,21);assert.equal(row.rate.blocked_until,now+30);assert.equal(row.receipts,1);assert.equal(row.fishing,0);assert.deepEqual(json(await recovered.command(peer,request)),json(ack));assert.deepEqual(inspect(),row);}finally{db.close();}
 }
});

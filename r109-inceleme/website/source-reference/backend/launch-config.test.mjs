import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {OPENING_MS,validateOpening,checkLaunch,applyLaunch,rollbackLaunch,publicStatus,fileStore,same} from './launch-config.mjs';
import {ensureLaunchSchema,createLaunchService,launchPhase} from '../../r60_mount_work/working/native510-bb3a6cc689c6/vds-server/src/launch-service.mjs';

function fixture(){
 const db=new DatabaseSync(':memory:');db.exec("CREATE TABLE accounts(id TEXT PRIMARY KEY, username TEXT, email TEXT); INSERT INTO accounts VALUES('registered-before-launch','ExistingPlayer','existing@example.invalid');");
 ensureLaunchSchema(db,{accountsOnly:true});
 let time=OPENING_MS-3600000;
 const launch=createLaunchService(db,{accountsOnly:true,now:()=>time});
 launch.save({...launch.settings(),mode:'maintenance',maintenance_text:'Planlı bakım',public_opens_at:Date.parse('2026-10-10T19:00:00+03:00')});
 let writes=0,record=null,afterWrite;
 const client={async admin(input){
  assert.equal(input.resource,'launch');
  if(input.method==='POST'){writes++;launch.save(input.body.settings);if(afterWrite)await afterWrite();}
  return {settings:launch.settings(),status:launch.status(),accounts:[{email:'never-store@example.invalid'}]};
 },async accountsStatus(){return launch.status();},async gameStatus(){return launch.status();}};
 const store={async read(){return record&&structuredClone(record);},async write(value){record=structuredClone(value);}};
 return {db,launch,client,store,get record(){return record;},get writes(){return writes;},setTime(v){time=v;},afterWrite(fn){afterWrite=fn;}};
}

test('native historical beta schedule would not satisfy the new opening target',()=>{
 const f=fixture();assert.equal(f.launch.status().phase,'maintenance');
 assert.throws(()=>publicStatus(f.launch.status(),OPENING_MS),/launch_public_schedule_mismatch/);
 f.db.close();
});
test('opening is Friday 20:00 in Istanbul and rejects invalid epochs',()=>{
 assert.equal(new Date(OPENING_MS).toISOString(),'2026-10-30T17:00:00.000Z');
 assert.equal(new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Istanbul',weekday:'long',hour:'2-digit',minute:'2-digit'}).format(OPENING_MS),'Friday 20:00');
 for(const bad of [NaN,Infinity,-1,0,1.5,'tomorrow',4102444800000])assert.throws(()=>validateOpening(bad),/launch_invalid_opening/);
});
test('check is read only and does not store account lists or change historical dates',async()=>{
 const f=fixture(),before=f.launch.settings(),result=await checkLaunch({client:f.client});
 assert.equal(f.writes,0);assert.deepEqual(f.launch.settings(),before);
 assert.equal(result.planned.public_opens_at,OPENING_MS);
 for(const key of ['registration_at','opens_at','ends_at'])assert.equal(result.planned[key],before[key]);
 assert(!JSON.stringify(result).includes('never-store'));f.db.close();
});
test('apply uses existing native service and ordinary accounts open exactly at the boundary',async()=>{
 const f=fixture(),before=f.launch.settings(),accountsBefore=f.db.prepare('SELECT * FROM accounts').all();
 const result=await applyLaunch(f);assert.equal(result.status,'applied');assert.equal(f.writes,1);
 assert.equal(result.verification.accounts.phase,'waiting');assert.equal(result.verification.game.canPlay,false);
 f.setTime(OPENING_MS-1);assert.equal(f.launch.status('registered-before-launch').canPlay,false);
 f.setTime(OPENING_MS);assert.equal(f.launch.status('registered-before-launch').canPlay,true);assert.equal(f.launch.status().phase,'open');
 f.setTime(OPENING_MS+365*86400000);assert.equal(f.launch.status().phase,'open');
 assert.deepEqual(f.db.prepare('SELECT * FROM accounts').all(),accountsBefore);
 for(const key of ['registration_at','opens_at','ends_at'])assert.equal(f.launch.settings()[key],before[key]);
 assert(!JSON.stringify(f.record).includes('never-store'));f.db.close();
});
test('normal login and realm issue still check server canPlay, independent of browser clock',async()=>{
 const f=fixture();await applyLaunch(f);
 const source=fs.readFileSync(new URL('../../r60_mount_work/working/native510-bb3a6cc689c6/dist-vds/server/index.js',import.meta.url),'utf8');
 const start=source.indexOf('function assertLaunchLoginAllowed439('),end=source.indexOf('\n',start),code=source.slice(start,end);
 assert(start>=0);const AuthRequestError=class extends Error{constructor(status,code,message){super(message);this.status=status;this.code=code;}};
 const run=new Function('globalThis','AuthRequestError',code+';return assertLaunchLoginAllowed439;')({__colLaunch:f.launch},AuthRequestError);
 f.setTime(OPENING_MS-1);assert.throws(()=>run('registered-before-launch'),e=>e.status===403);
 f.setTime(OPENING_MS);assert.doesNotThrow(()=>run('registered-before-launch'));
 const realmRoute=source.slice(source.indexOf('//#region app/api/realm/issue/route.ts'),source.indexOf('//#region app/api/realm/redeem/route.ts'));
 assert(realmRoute.includes('!globalThis.__colLaunch?.status(session.account.id).canPlay'));
 f.db.close();
});
test('repeat apply and an already scheduled setup are idempotent',async()=>{
 const f=fixture();await applyLaunch(f);await applyLaunch(f);assert.equal(f.writes,1);
 let record=null;const secondStore={async read(){return record;},async write(v){record=structuredClone(v);}};
 const result=await applyLaunch({...f,store:secondStore});assert.equal(result.status,'unchanged');assert.equal(f.writes,1);
 await rollbackLaunch({client:f.client,store:secondStore});assert.equal(f.writes,1);f.db.close();
});
test('lost successful save response reconciles once, with durable prepared receipt',async()=>{
 const f=fixture();f.afterWrite(()=>{assert.equal(f.record.status,'prepared');throw Error('lost response');});
 const result=await applyLaunch(f);assert.equal(result.status,'applied');assert.equal(f.writes,1);f.db.close();
});
test('failure writing prepared receipt never mutates the server',async()=>{
 const f=fixture();await assert.rejects(applyLaunch({...f,store:{async read(){return null;},async write(){throw Error('disk full');}}}),/disk full/);
 assert.equal(f.writes,0);assert.equal(f.launch.settings().mode,'maintenance');f.db.close();
});
test('a concurrent administrator edit cannot be overwritten by apply',async()=>{
 const f=fixture(),base=f.store.write;f.store.write=async value=>{await base(value);if(value.status==='prepared')f.launch.save({...f.launch.settings(),mode:'closed'});};
 await assert.rejects(applyLaunch(f),/launch_apply_conflict_keep_receipt/);assert.equal(f.launch.settings().mode,'closed');f.db.close();
});
test('rollback restores policy through native writer without touching accounts',async()=>{
 const f=fixture(),before=f.launch.settings(),accounts=f.db.prepare('SELECT * FROM accounts').all();
 await applyLaunch(f);const result=await rollbackLaunch(f);assert.equal(result.status,'rolled_back');assert.equal(f.launch.settings().mode,'maintenance');assert.equal(f.launch.settings().public_opens_at,before.public_opens_at);
 assert.equal(f.launch.settings().revision,before.revision+2);assert.deepEqual(f.db.prepare('SELECT * FROM accounts').all(),accounts);
 await rollbackLaunch(f);assert.equal(f.writes,2);f.db.close();
});
test('rollback refuses a later admin change and retains it',async()=>{
 const f=fixture();await applyLaunch(f);f.launch.save({...f.launch.settings(),mode:'closed'});
 await assert.rejects(rollbackLaunch(f),/launch_rollback_refused_later_admin_change/);assert.equal(f.launch.settings().mode,'closed');f.db.close();
});
test('a failed public verification retains applied receipt so installer can roll back',async()=>{
 const f=fixture();f.client.gameStatus=async()=>{throw Error('game unavailable');};
 await assert.rejects(applyLaunch(f),/game unavailable/);assert.equal(f.record.status,'applied');
 await rollbackLaunch(f);assert.equal(f.launch.settings().mode,'maintenance');f.db.close();
});
test('rollback safely resolves a lost HTTP response',async()=>{
 const f=fixture();await applyLaunch(f);f.afterWrite(()=>{throw Error('lost rollback response');});
 await rollbackLaunch(f);assert.equal(f.record.status,'rolled_back');assert.equal(f.writes,2);f.db.close();
});
test('unknown rollback result is recovered without replay after a lost subsequent read',async()=>{
 const f=fixture();await applyLaunch(f);const admin=f.client.admin;let broken=false;
 f.client.admin=async input=>{if(broken&&input.method==='GET')throw Error('offline');return admin(input);};f.afterWrite(()=>{broken=true;});
 await assert.rejects(rollbackLaunch(f),/launch_rollback_result_unknown_keep_receipt/);assert.equal(f.record.status,'rollback_prepared');broken=false;f.afterWrite(null);
 await rollbackLaunch(f);assert.equal(f.record.status,'rolled_back');assert.equal(f.writes,2);f.db.close();
});
test('file receipt is atomically written mode 0600 without account data',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'col-launch-test-'));try{
  const file=path.join(dir,'receipt.json'),store=fileStore(file);assert.equal(await store.read(),null);
  const f=fixture();await applyLaunch({...f,store});assert.equal(fs.statSync(file).mode&0o777,0o600);assert.equal((await store.read()).status,'applied');assert(!fs.readFileSync(file,'utf8').includes('never-store'));f.db.close();
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

test('public timestamps alone cannot confirm a game whose simulation gate is still closed',async()=>{
 const f=fixture();f.client.panelStatus=async()=>({version:'panel511-r27',revision:f.launch.settings().revision,approvedRevision:null,jobsEnabled:false,playGate:{allowed:false}});
 await assert.rejects(applyLaunch(f),/launch_game_not_ready/);assert.equal(f.record.status,'applied');await rollbackLaunch(f);f.db.close();
});
test('an unhealthy native preflight refuses schedule changes before writing a receipt',async()=>{
 const f=fixture();f.client.preflight=async()=>{throw Error('launch_core_health_not_ready');};
 await assert.rejects(applyLaunch(f),/launch_core_health_not_ready/);assert.equal(f.writes,0);assert.equal(f.record,null);f.db.close();
});

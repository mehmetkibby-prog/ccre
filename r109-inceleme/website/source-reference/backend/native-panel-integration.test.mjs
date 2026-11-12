import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {OPENING_MS,applyLaunch,rollbackLaunch} from './launch-config.mjs';
import {ensureLaunchSchema,createLaunchService} from '../../r60_mount_work/working/native510-bb3a6cc689c6/vds-server/src/launch-service.mjs';
import {guardPanelAdmin} from '../../r60_mount_work/working/core511-source/scripts/delivery511/panel-control.mjs';

function fixture({healthy=true,ready=true}={}){
 const db=new DatabaseSync(':memory:');db.exec('CREATE TABLE accounts(id TEXT PRIMARY KEY)');ensureLaunchSchema(db,{accountsOnly:true});
 let now=OPENING_MS-3600000;const launch=createLaunchService(db,{accountsOnly:true,now:()=>now});launch.save({...launch.settings(),mode:'maintenance'});
 const panel=()=>({version:'panel511-r27',revision:launch.settings().revision,phase:launch.status().phase,approvedRevision:ready?launch.settings().revision:null,jobsEnabled:ready,canOpen:healthy,playGate:{allowed:ready}});
 const health={kernel511:{ready:healthy},durable:true,realm:{dbIdentity:'fixture'},channelProcesses:{channels:[1,2,3,4].map(channel=>({channel,capacity:25,ready:true}))}};
 const runtime={role:'accounts',manifest:{primaryRealmId:'r1',realms:[{id:'r1',dbIdentity:'fixture',ports:{app:12345}}]},maintenancePublisher438:{publish(){}},async admin(id,input){if(input.method==='POST')launch.save(input.body.settings);return {settings:launch.settings(),status:launch.status()};}};
 const prior=globalThis.__colLaunch;globalThis.__colLaunch=launch;
 const detach=guardPanelAdmin(runtime,{probe:async(port,path)=>path==='/api/vds-health'?health:panel(),clock:()=>now,sleep:async ms=>{now+=ms;}});
 let receipt=null;const store={async read(){return receipt;},async write(value){receipt=structuredClone(value);}};
 return {launch,client:{admin:input=>runtime.admin('fixture-owner',input),accountsStatus:async()=>launch.status(),gameStatus:async()=>launch.status(),panelStatus:async()=>panel()},store,get receipt(){return receipt;},close(){detach();if(prior===undefined)delete globalThis.__colLaunch;else globalThis.__colLaunch=prior;db.close();}};
}

test('native panel guard confirms scheduled waiting simulation, then native rollback restores maintenance',async()=>{
 const f=fixture();try{const result=await applyLaunch(f);assert.equal(result.status,'applied');assert.equal(result.verification.gameReady.jobsEnabled,true);assert.equal(f.launch.status().phase,'waiting');await rollbackLaunch(f);assert.equal(f.launch.status().phase,'maintenance');}finally{f.close();}
});
test('native panel rejects unavailable channels without altering the launch policy',async()=>{
 const f=fixture({healthy:false});try{const revision=f.launch.settings().revision;await assert.rejects(applyLaunch(f),/hazır değil/);assert.equal(f.launch.settings().revision,revision);assert.equal(f.launch.status().phase,'maintenance');assert.equal(f.receipt.status,'not_applied');}finally{f.close();}
});
test('native six-second confirmation fallback stays in maintenance and installer cannot overwrite its newer revision',async()=>{
 const f=fixture({ready:false});try{const revision=f.launch.settings().revision;await assert.rejects(applyLaunch(f),/launch_apply_conflict_keep_receipt/);assert.equal(f.launch.settings().revision,revision+2);assert.equal(f.launch.status().phase,'maintenance');await assert.rejects(rollbackLaunch(f),/launch_rollback_refused_later_admin_change/);}finally{f.close();}
});

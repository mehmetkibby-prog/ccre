import fs from 'node:fs';
import path from 'node:path';
import {installTransaction} from './install-controller.mjs';
import {productionOperations,verifyPackage,CANDIDATE} from './install-operations.mjs';
const action=process.argv[2],releaseRoot=path.resolve(import.meta.dirname,'../../..'),stateFile='/var/lib/core511/state.json';
if(action==='open')throw Error('Oyun yalnız admin panelinden açılır. Panelde Oyun Açık seçin.');
if(!['install','rollback'].includes(action)||process.argv.length!==3)throw Error('Usage: col-core511 install|rollback');
if(process.getuid()!==0)throw Error('root_required');
verifyPackage(releaseRoot);
const o=productionOperations(releaseRoot),previous=fs.existsSync(stateFile)?JSON.parse(fs.readFileSync(stateFile,'utf8')):null;
let result;
if(action==='install'){
 // Do not erase the saved rollback binding on an accidental reinstall of an open game.
 if(previous?.installed===true&&previous.stage==='open')throw Error('already_installed_and_open_use_rollback_before_reinstall');
 if(previous?.installed===true&&previous.stage==='ready'){
  if(previous.candidate!==CANDIDATE||previous.releaseRoot!==releaseRoot)throw Error('other_installed_candidate');
  await o.resume(previous.prior);await o.assertMaintenance(previous.prior);await o.health(previous.prior);result={installed:true,stage:'ready',maintenance:true,idempotent:true};
 }else if(previous?.prior&&previous.rollbackError){throw Error('previous_rollback_failed_use_rollback_command');}
 else if(previous?.prior&&previous.installed===undefined){
  await o.resume(previous.prior);const p=await o.maintenance(previous.prior);previous.prior.maintenanceRevision=p.revision;await o.assertEmpty(previous.prior);
  const rollback=await o.rollback(previous.prior,{activated:true});await o.journal({stage:'recovered_interrupted_install',installed:false,prior:previous.prior,rollback,maintenance:true});throw Error('interrupted_install_recovered_run_install_again');
 }else result=await installTransaction(o);
}else{
 if(!previous?.prior||previous.candidate!==CANDIDATE||previous.releaseRoot!==releaseRoot)throw Error('matching_installation_state_required');
 const p=previous.prior;await o.resume(p);
  const frame=await o.maintenance(p);p.maintenanceRevision=frame.revision;await o.assertEmpty(p);const rollback=await o.rollback(p,{activated:true});result={installed:false,stage:'rolled_back',maintenance:true,opened:false,prior:p,rollback,canary:previous.canary};await o.journal(result);
}
console.log(JSON.stringify(result));if(result?.installed===false&&action==='install')process.exitCode=1;

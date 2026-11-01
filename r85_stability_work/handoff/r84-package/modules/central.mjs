// Signed access to the existing accounts authority; never opens its database.
import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
const [root,gameFile,accountsFile,operation,serialized]=process.argv.slice(2);
const read=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const game=read(gameFile),accounts=read(accountsFile),manifest=read(game.realm.manifestFile);
const {maintenanceClient}=await import(pathToFileURL(root+'/core511-source/scripts/delivery511/maintenance-client.mjs'));
const client=maintenanceClient({gameConfig:game,accountsConfig:accounts,manifest});
const expected=serialized?JSON.parse(serialized):null;
async function snapshot(){
 const first=await client.policy();
 const {settings,status}=await client.admin({resource:'launch',method:'GET'});
 const {realms}=await client.admin({resource:'realms',method:'GET'});
 const row=realms.find(r=>r.id===game.realm.id),last=await client.policy();
 if(!row||first.revision!==last.revision||settings.revision!==last.revision||status.phase!==last.phase)throw Error('central_policy_changed');
 return {revision:last.revision,phase:last.phase,mode:settings.mode,enabled:settings.enabled,
  registrationOpen:status.registrationOpen,deadlineMs:last.deadlineMs??0,
  realm:{id:row.id,status:row.configuredStatus,registrationOpen:row.registrationOpen}};
}
const sameLaunch=(a,b)=>a.revision===b.revision&&a.phase===b.phase&&a.mode===b.mode&&a.enabled===b.enabled;
const sameRealm=(a,b)=>a.id===b.id&&a.status===b.status&&a.registrationOpen===b.registrationOpen;
let current=await snapshot();
if(operation==='gate'){
 if(!expected||!sameLaunch(current,expected)||!sameRealm(current.realm,expected.realm))throw Error('gate_precondition_changed');
 if(current.realm.status!=='maintenance'){
  await client.admin({resource:'realms',method:'POST',body:{action:'realm',realmId:game.realm.id,status:'maintenance',registrationOpen:current.realm.registrationOpen}});
 }
 current=await snapshot();
 if(!sameLaunch(current,expected)||current.realm.status!=='maintenance'||current.realm.registrationOpen!==expected.realm.registrationOpen)throw Error('gate_not_verified');
}else if(operation==='restore'){
 if(!expected)throw Error('restore_expected_missing');
 if(current.realm.status==='maintenance'&&current.realm.registrationOpen===expected.realm.registrationOpen&&expected.realm.status!=='maintenance'){
  await client.admin({resource:'realms',method:'POST',body:{action:'realm',realmId:game.realm.id,status:expected.realm.status,registrationOpen:expected.realm.registrationOpen}});
  current=await snapshot();
  if(!sameRealm(current.realm,expected.realm))throw Error('gate_restore_not_verified');
 }else if(!sameRealm(current.realm,expected.realm)){
  // A later admin choice belongs to the owner, not to this installer.
  current.ownerRealmChangePreserved=true;
 }
}else if(operation!=='snapshot')throw Error('unknown_operation');
process.stdout.write(JSON.stringify(current));

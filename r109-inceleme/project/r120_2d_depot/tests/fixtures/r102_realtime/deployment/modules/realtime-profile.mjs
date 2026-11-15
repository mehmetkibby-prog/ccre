// Academy transport has no primary load-test controller. Ownership tombstones
// and native signed-ticket checks remain effective in this separate process.
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {randomBytes} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';

const need=(ok,code)=>{if(!ok)throw Error(code);};
export async function academyProfile(root,file,env=process.env){
 need(path.isAbsolute(root)&&fs.realpathSync(root)===root,'realtime_release_path');
 need(path.isAbsolute(file)&&fs.realpathSync(file)===file,'realtime_config_path');
 const config=JSON.parse(fs.readFileSync(file,'utf8'));
 need(config.realm?.id==='r2'&&env.CORE_REALM_ID==='r2','realtime_academy_only');
 need(config.delivery511?.releaseRoot===root,'realtime_release_identity');
 const manifest=JSON.parse(fs.readFileSync(config.realm.manifestFile,'utf8'));
 const realm=manifest.realms.find(r=>r.id==='r2');
 need(manifest.primaryRealmId==='r1'&&realm?.dbIdentity===config.realm.dbIdentity&&realm.database===config.database,'realtime_manifest_identity');
 need(fs.realpathSync(config.database)===config.database&&path.dirname(file)===realm.dataRoot&&path.dirname(config.database)===realm.dataRoot,'realtime_database_path');
 need(Number(env.PORT)===realm.ports.realtime&&env.HOST==='127.0.0.1'&&env.ALLOWED_ORIGINS===realm.origin,'realtime_network_identity');
 need(env.REALTIME_PUBLIC_KEY_SPKI&&env.REALTIME_PUBLIC_KEY_SPKI===config.environment?.REALTIME_PUBLIC_KEY_SPKI,'realtime_signing_identity');
 const native=path.join(root,'native510-bb3a6cc689c6');
 const get=rel=>import(pathToFileURL(path.join(native,rel)).href);
 const [{assertRealmDatabaseIdentity},{seedRegistryFrame},{installRegistry},{VERSION},{createLabRealtimeGuard},{LAB_PROOF_HEADER}]=await Promise.all([
  get('vds-server/src/realm-database-identity.mjs'),get('vds-server/src/loadlab/realm-control.mjs'),
  get('vds-server/src/loadlab/registry.mjs'),get('vds-server/src/loadlab/protocol.mjs'),
  get('realtime-server/src/loadlab-rt.mjs'),get('realtime-server/src/loadlab-proof.mjs')
 ]);
 const db=new DatabaseSync(config.database,{readOnly:true});let seed;
 try{
  db.exec('PRAGMA query_only=ON; PRAGMA busy_timeout=2000; BEGIN');
  assertRealmDatabaseIdentity(db,{realmId:'r2',dbIdentity:realm.dbIdentity});
  seed=seedRegistryFrame(db,VERSION);db.exec('COMMIT');
 }finally{db.close();}
 const registryHandle=installRegistry({seed});registryHandle.registry.deny();
 // No controller key is read or copied. The fresh unexported key cannot admit
 // external load-test proofs, and explicit rejection below keeps this closed.
 const nativeGuard=createLabRealtimeGuard({key:randomBytes(32).toString('hex')});
 const guard={...nativeGuard,admit(request,route){
  if(request.headers[LAB_PROOF_HEADER]!==undefined)throw Error('academy_loadlab_disabled');
  return nativeGuard.admit(request,route);
 }};
 return {realmId:'r2',dbIdentity:realm.dbIdentity,port:realm.ports.realtime,native,registryHandle,guard,
  close(){guard.close();registryHandle.close();}};
}

import fs from 'node:fs';
import path from 'node:path';
import {randomBytes} from 'node:crypto';
import assert from 'node:assert/strict';
import {native,temporary} from './helpers.mjs';
import {PROTOCOL} from '../contract.mjs';
import {NativeRealmStartup} from '../native-realm-startup.mjs';
const {RealmServiceVerifier}=await native('vds-server/src/realm-service-auth.mjs');

// The native signed request is verified at a controlled fetch boundary. There
// is no network server or external account service in this isolated fixture.
export function realmStartupConfig(t,host,{state=null,policy=null,securityRead=()=>host.database.sqlite}={}){
 const dir=temporary(t),key=randomBytes(32),manifestFile=path.join(dir,'realms.json'),keyFile=path.join(dir,'realm-key'),id=host.expected.realmId,realm={id,name:'Core fixture',status:'open',registrationOpen:true,channels:4,coreProtocol:PROTOCOL,initialChannelCapacity:25,origin:'https://game.example.test',realtimeOrigin:'https://realtime.example.test',dataRoot:path.dirname(host.file),database:host.file,dbIdentity:host.expected.dbIdentity,ports:{proxy:3410,app:3411,realtime:3412,dungeon:3413,voice:3414,channels:[3415,3416,3417,3418]}},manifest={version:1,phase:'416b',primaryRealmId:id,accountsDatabase:path.join(dir,'accounts.sqlite'),authOrigin:'https://accounts.example.test',authPort:3400,realms:[realm]};
 fs.writeFileSync(manifestFile,JSON.stringify(manifest));fs.writeFileSync(keyFile,key.toString('hex'));const config={database:host.file,realm:{id,role:'game',manifestFile,keyFile}},verifier=new RealmServiceVerifier(new Map([[id,key]])),calls=[],prior=globalThis.fetch;
 let frame=policy??{revision:1,phase:'normal',startedAt:0,deadlineMs:0,adminAccountId:'',maintenanceText:''};
 globalThis.fetch=async(url,options)=>{
  assert.equal(url,'http://127.0.0.1:3400/api/realm/internal');assert.equal(options.method,'POST');const pathname=options.headers['x-col-service-path'];assert.deepEqual(verifier.verify({method:'POST',pathname,headers:options.headers,body:options.body}),{realmId:id});const data=JSON.parse(options.body);calls.push({pathname,account:data.accountId??null});
  if(pathname==='/internal/maintenance/status')return Response.json(frame);
  assert.equal(pathname,'/internal/security/check');const local=securityRead().prepare('SELECT security_version FROM accounts WHERE id=?').get(data.accountId),value=state?await state(data.accountId,local):{securityVersion:local.security_version,blocked:false,canPlay:true};return Response.json({...value,realmStatus:'open',registrationOpen:true,launch:{phase:frame.phase},maintenanceControl438:frame});
 };
 t.after(()=>{globalThis.fetch=prior;});return {config,calls,setPolicy:value=>{frame=value;},prepare:()=>NativeRealmStartup.prepare(host,config)};
}

import {mkdir,writeFile,open} from 'node:fs/promises';
import {generateKeyPairSync,randomBytes,randomUUID} from 'node:crypto';
import path from 'node:path';
import {validateRealmManifest} from './realm-manifest.mjs';
import {createEmptyAccountsDatabase} from './accounts-bootstrap.mjs';
import {createEmptyRealmWorld} from './realm-world-bootstrap.mjs';
const write=async(file,data)=>writeFile(file,typeof data==='string'?data:JSON.stringify(data,null,2)+'\n',{mode:0o600,flag:'wx'});

// Creates a NEW installation directory. Never opens the legacy DB or starts a
// process; activation/backup approval belongs to the installer, not provisioning.
export async function prepareRealmInstallation({root,authOrigin,realmOrigins,realtimeOrigins,environment={},portBase=4100}) {
 if(!path.isAbsolute(root)||path.normalize(root)!==root||root==='/')throw new Error('Explicit new installation root required');
 if(!Array.isArray(realmOrigins)||realmOrigins.length!==2||!Array.isArray(realtimeOrigins)||realtimeOrigins.length!==2)throw new Error('416a provisions exactly two realms');
 const manifest=validateRealmManifest({version:1,phase:'416a',primaryRealmId:'r1',accountsDatabase:path.join(root,'accounts','accounts.sqlite'),authOrigin,authPort:portBase,
  realms:[1,2].map((n,i)=>({id:'r'+n,name:'Sunucu '+n,status:n===1?'open':'closed',registrationOpen:n===1,channels:3,initialChannelCapacity:15,
   origin:realmOrigins[i],realtimeOrigin:realtimeOrigins[i],dataRoot:path.join(root,'r'+n),database:path.join(root,'r'+n,'game.sqlite'),dbIdentity:randomUUID(),
   ports:{proxy:portBase+n*10,app:portBase+n*10+1,realtime:portBase+n*10+2,dungeon:portBase+n*10+3}}))});
 await mkdir(root,{mode:0o755});
 await mkdir(path.join(root,'accounts'),{mode:0o700});
 const manifestFile=path.join(root,'manifest.json');await writeFile(manifestFile,JSON.stringify(manifest,null,2)+'\n',{mode:0o644,flag:'wx'});
 createEmptyAccountsDatabase({destination:manifest.accountsDatabase});
 const keys={};
 for(const realm of manifest.realms){
  await mkdir(realm.dataRoot,{mode:0o700});
  createEmptyRealmWorld({destination:realm.database,realmId:realm.id,dbIdentity:realm.dbIdentity});
  const serviceKey=randomBytes(32).toString('hex');keys[realm.id]=serviceKey;
  const keyFile=path.join(realm.dataRoot,'service.key');await write(keyFile,serviceKey+'\n');
  const pair=generateKeyPairSync('ec',{namedCurve:'prime256v1'});
  const signing=pair.privateKey.export({type:'pkcs8',format:'der'}).toString('base64'),verification=pair.publicKey.export({type:'spki',format:'der'}).toString('base64');
  const hosts=[new URL(realm.origin).host];
  const realmEnv={...environment,ADMIN_EMAIL:'',ADMIN_USER_ID:'',CORE_REALM_ID:realm.id,CORE_VOICE_PUBLIC_URL:realm.realtimeOrigin.replace('https:','wss:')+'/voice',
   CORE_APP_PORT:String(realm.ports.app),CORE_PROXY_PORT:String(realm.ports.proxy),CORE_DUNGEON_PORT:String(realm.ports.dungeon),CORE_VOICE_PORT:String(realm.ports.dungeon+1),
   REALTIME_SIGNING_PRIVATE_KEY:signing,REALTIME_PUBLIC_KEY_SPKI:verification,REALTIME_HTTP_ORIGIN:`http://127.0.0.1:${realm.ports.realtime}`,REALTIME_SOCKET_URL:realm.realtimeOrigin.replace('https:','wss:')+'/ws'};
  for(const key of ['RESEND_API_KEY','AUTH_EMAIL_FROM','AUTH_PUBLIC_ORIGIN'])delete realmEnv[key];
  const config={database:realm.database,hosts,environment:realmEnv,proxyToken:randomBytes(32).toString('hex'),realm:{role:'game',id:realm.id,dbIdentity:realm.dbIdentity,manifestFile,keyFile}};
  await mkdir(path.join(realm.dataRoot,'jobs','realm'),{recursive:true,mode:0o700});
  await write(path.join(realm.dataRoot,'jobs','realm','config.json'),config);
  await write(path.join(realm.dataRoot,'state.json'),{status:'active',job:'realm'});
  await write(path.join(realm.dataRoot,'realtime.env'),Object.entries({PORT:String(realm.ports.realtime),HOST:'127.0.0.1',ALLOWED_ORIGINS:realm.origin,REALTIME_PUBLIC_KEY_SPKI:verification,REALTIME_RELEASE_ID:'416a',MAX_CONNECTIONS_PER_IP:'100'}).map(([k,v])=>`${k}=${v}`).join('\n')+'\n');
 }
 const keysFile=path.join(root,'accounts','realm-keys.json');await write(keysFile,keys);
 await write(path.join(root,'accounts','config.json'),{database:manifest.accountsDatabase,hosts:[new URL(authOrigin).host],environment:{...environment,ADMIN_EMAIL:'',ADMIN_USER_ID:'',AUTH_PUBLIC_ORIGIN:authOrigin},realm:{role:'accounts',manifestFile,keysFile}});
 await write(path.join(root,'prepared.json'),{version:'416a',createdAtMs:Date.now(),phase:'prepared-not-active',resetAuthorized:false});
 const directory=await open(root,'r');try{await directory.sync();}finally{await directory.close();}
 return manifest;
}

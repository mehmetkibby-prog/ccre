import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {academyProfile} from './realtime-profile.mjs';

const [root,config]=process.argv.slice(2);
const manifest=JSON.parse(fs.readFileSync(new URL('./bundle.json',import.meta.url)));
if(manifest.root!==root||manifest.config!==config)throw Error('realtime_bundle_identity');
for(const [name,sha] of Object.entries(manifest.files)){
 if(!/^[a-z-]+\.mjs$/.test(name)||createHash('sha256').update(fs.readFileSync(new URL('./'+name,import.meta.url))).digest('hex')!==sha)throw Error('realtime_bundle_integrity');
}
const profile=await academyProfile(root,config);
const {realtimeSecurityReady}=await import(pathToFileURL(path.join(profile.native,'realtime-server/src/security.mjs')).href);
await realtimeSecurityReady();
const {createRealtimeServer}=await import('./server.mjs');
const runtime=createRealtimeServer(profile);
runtime.server.listen(profile.port,'127.0.0.1',()=>console.log('Core Akademi realtime hazır: R102_REALTIME1'));
let stopping=false;
const shutdown=()=>{
 if(stopping)return;stopping=true;
 clearInterval(runtime.heartbeat);runtime.movementRelay.close();runtime.combatRelay.close();profile.close();
 for(const socket of runtime.webSockets.clients)socket.close(1001,'Server restarting');
 runtime.server.close(()=>process.exit(0));setTimeout(()=>process.exit(1),5000).unref();
};
process.once('SIGTERM',shutdown);process.once('SIGINT',shutdown);

import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {parse} from '../perf-r11/tests/parser.mjs';

const root=process.env.COL_CORE511_BASE??path.resolve(import.meta.dirname,'../../../native510-bb3a6cc689c6'),out=path.join(import.meta.dirname,'generated');
const hash=value=>createHash('sha256').update(value).digest('hex'),baseline='bb3a6cc689c695d97f127a2eefb9ad141b0e655eb39bbebeea5f05704074ad3b';
const bytes=fs.readFileSync(path.join(root,'realm-package-manifest.json'));if(hash(bytes)!==baseline)throw Error('Exact V510 baseline required');
const manifest=JSON.parse(bytes),bodies=[],sources=[],declarations=[];
for(const [file,names]of [
 ['realtime-server/src/rooms.mjs',['MAX_EVENT_BYTES','roomKey','safeArea','send','broadcast','broadcastWorldEvent','broadcastPlayerEvent']],
 ['dist-vds/server/channel-runtime/index.mjs',['safeArenaMatchId','realtimeRoomName']]
]){
 const source=fs.readFileSync(path.join(root,file),'utf8');if(manifest.files.find(r=>r.path===file)?.sha256!==hash(source))throw Error('Changed native notification source');
 const ast=parse(source,{ecmaVersion:'latest',sourceType:'module'});sources.push({file,sha256:hash(source)});
 for(const name of names){const node=ast.body.map(n=>n.declaration??n).find(n=>(n.id?.name??n.declarations?.[0]?.id?.name)===name);if(!node)throw Error('Missing native declaration '+name);const text=source.slice(node.start,node.end);declarations.push(text);bodies.push({file,name,start:node.start,end:node.end,sha256:hash(text)});}
}
const adapted=declarations.map(text=>{
 if(text.startsWith('function safeArea('))return text.replace('function safeArea(value) {','function safeArea(value) {\n  if(isAdventureArea(value))return value;');
 if(text.startsWith('function realtimeRoomName('))return text.replace('const safeArea = /^','const safeArea = isAdventureArea(area) ? area : /^');
 return text;
});
const generated=`import {isAdventureArea} from '../adventure-maps.mjs';
import {eventForViewer} from ${JSON.stringify(path.relative(out,path.join(root,'realtime-server/src/visibility.mjs')))};
// Native sender bodies are unchanged; area validation and room construction
// also recognize strict adventure IDs. Authenticated sockets remain scoped.
export function createNativeNotificationRules({socketsByPlayer,hiddenPlayer,motionCorkR11,clock=Date.now}){
 const Date={now:clock},traffic={bytesSent:0,framesSent:0};
 ${adapted.join('\n')}
 return {roomKey,safeArea,safeArenaMatchId,realtimeRoomName,broadcast,broadcastWorldEvent,broadcastPlayerEvent,MAX_EVENT_BYTES};
}
`;
parse(generated,{ecmaVersion:'latest',sourceType:'module'});fs.writeFileSync(path.join(out,'notification-rules.mjs'),generated);
fs.writeFileSync(path.join(out,'notification-proof.json'),JSON.stringify({baselineManifestSha256:baseline,sources,bodies,generatedSha256:hash(generated),edits:['Original9 native declaration source hashes retained; safeArea and realtimeRoomName additionally recognize strict adventure IDs','Authenticated snapshot sockets and sender capture injected; no network or mutable socket ownership','Native private audience limits, private world scope, GM filtering and24000-byte limit preserved']},null,2)+'\n');console.log(JSON.stringify({bodies:bodies.length,bytes:Buffer.byteLength(generated)}));

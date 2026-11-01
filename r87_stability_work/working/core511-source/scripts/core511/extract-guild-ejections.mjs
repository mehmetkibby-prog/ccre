import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {parse} from '../perf-r11/tests/parser.mjs';
const root=process.env.COL_CORE511_BASE??path.resolve(import.meta.dirname,'../../../native510-bb3a6cc689c6'),hash=s=>createHash('sha256').update(s).digest('hex'),baseline='bb3a6cc689c695d97f127a2eefb9ad141b0e655eb39bbebeea5f05704074ad3b';
const bytes=fs.readFileSync(path.join(root,'realm-package-manifest.json'));if(hash(bytes)!==baseline)throw Error('Exact V510 baseline required');
const file='dist-vds/server/index.js',source=fs.readFileSync(path.join(root,file),'utf8'),manifest=JSON.parse(bytes);if(manifest.files.find(r=>r.path===file)?.sha256!==hash(source))throw Error('Changed native guild source');
const ast=parse(source,{ecmaVersion:'latest',sourceType:'module'}),fn=name=>ast.body.find(n=>n.type==='FunctionDeclaration'&&n.id?.name===name),publisher=fn('publishGuildEjections'),route=fn('POST$19');if(!publisher||!route)throw Error('Native guild flow missing');
const original=source.slice(publisher.start,publisher.end),post=source.slice(route.start,route.end);if(!post.includes('if (body.action === "revoke") await publishGuildEjections(service.repairAll());'))throw Error('Native revoke repair order changed');
const dependencies=publisher.body.body[1];if(dependencies.type!=='VariableDeclaration'||source.slice(dependencies.start,dependencies.end)!=='const [{ db }, { publishRealtimeRoomEvent }] = await Promise.all([Promise.resolve().then(() => game_world_exports), Promise.resolve().then(() => realtime_room_exports)]);')throw Error('Native guild publisher imports moved');
let body=original.slice(0,dependencies.start-publisher.start)+original.slice(dependencies.end-publisher.start);
body=body.replace('async function publishGuildEjections(events)','export function nativeGuildEjections(events, { db, publishRealtimeRoomEvent, now })').replaceAll('await ','').replace('Date.now()','now()');
// Only immediate record functions are supplied in the atomic writer. Preserve
// native event mapping; collecting synchronous records needs no Promise join.
body=body.replace('Promise.all(events.map(', 'events.forEach(').replace(/\}\)\)\);\s*\}$/, '}));\n}');
const generated='// Native guild revoke ejection publisher; synchronous dependency/clock adapter.\n'+body+'\n';parse(generated,{ecmaVersion:'latest',sourceType:'module'});
const out=path.join(import.meta.dirname,'generated');fs.writeFileSync(path.join(out,'guild-ejection-rules.mjs'),generated);fs.writeFileSync(path.join(out,'guild-ejection-proof.json'),JSON.stringify({baselineManifestSha256:baseline,file,sourceSha256:hash(source),bodies:[publisher,route].map(n=>({name:n.id.name,start:n.start,end:n.end,sha256:hash(source.slice(n.start,n.end))})),generatedSha256:hash(generated),edits:['Inject original db and room publisher instead of dynamic module imports','Remove async/await and Promise join for synchronous atomic event recording','Bind native Date.now to the accepted operation clock; retain native field mapping and original cycle query']},null,2)+'\n');
console.log(JSON.stringify({functions:1,originalRevokeRepairVerified:true}));

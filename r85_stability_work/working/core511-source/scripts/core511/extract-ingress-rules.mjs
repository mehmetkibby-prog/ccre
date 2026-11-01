import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {parse} from '../perf-r11/tests/parser.mjs';
const root=process.env.COL_CORE511_BASE??path.resolve(import.meta.dirname,'../../../native510-bb3a6cc689c6'),out=path.join(import.meta.dirname,'generated'),hash=x=>createHash('sha256').update(x).digest('hex');
const baseline='bb3a6cc689c695d97f127a2eefb9ad141b0e655eb39bbebeea5f05704074ad3b',bytes=fs.readFileSync(path.join(root,'realm-package-manifest.json'));if(hash(bytes)!==baseline)throw Error('Exact V510 baseline required');
const file='dist-vds/server/channel-runtime/index.mjs',source=fs.readFileSync(path.join(root,file),'utf8'),manifest=JSON.parse(bytes);if(manifest.files.find(r=>r.path===file)?.sha256!==hash(source))throw Error('Native ingress changed');
const ast=parse(source,{ecmaVersion:'latest',sourceType:'module'}),names=['enforceLocalActionRate','rate'],selected=names.map(name=>{const n=ast.body.find(n=>n.type==='FunctionDeclaration'&&n.id.name===name);if(!n)throw Error('Missing native rate '+name);return {name,text:source.slice(n.start,n.end)};});
const generated=`export function createIngressRules(clock){const Date={now:clock},localWindows=new Map(),rates=new Map();let nextLocalCleanupAtMs=0;
${selected.map(n=>n.text).join('\n')}
return {action:enforceLocalActionRate,dungeon:rate,localWindows,rates};}
`;
fs.writeFileSync(path.join(out,'ingress-rules.mjs'),generated);fs.writeFileSync(path.join(out,'ingress-proof.json'),JSON.stringify({baselineManifestSha256:baseline,file,sourceSha256:hash(source),bodies:selected.map(({name,text})=>({name,sha256:hash(text)})),generatedSha256:hash(generated),edits:['Exact native action category thresholds and dungeon 25/second function; injected monotonic test clock only','Transfer carries server-owned windows without resetting their counts']},null,2)+'\n');
console.log(JSON.stringify({bytes:Buffer.byteLength(generated)}));

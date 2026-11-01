import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {parse} from '../perf-r11/tests/parser.mjs';
const hash=s=>createHash('sha256').update(s).digest('hex');
export function patchNativeClientReference(source){
 const client=JSON.parse(fs.readFileSync(new URL('./generated/native-client-proof.json',import.meta.url))),edits=[];let output=source;
 for(const [file,name]of [[client.file,client.name],[client.portal.file,client.portal.name]]){const original=path.basename(file);if(!/^(game-client|auth-portal)-core511-[a-f0-9]{16}\.js$/.test(name))throw Error('native_client_reference_name');let at=0,count=0;while((at=source.indexOf(original,at))>=0){edits.push({start:at,end:at+original.length,original,replacement:name});at+=original.length;count++;}if(!count)throw Error('native_client_reference_missing');}
 for(const e of edits.toSorted((a,b)=>b.start-a.start))output=output.slice(0,e.start)+e.replacement+output.slice(e.end);parse(output,{ecmaVersion:'latest',sourceType:'module'});return {source:output,proof:{sourceSha256:hash(source),patchedSha256:hash(output),edits,scope:'Only pinned game-client preload/RSC reference and its unchanged auth portal importer; both renamed by content hash'}};
}

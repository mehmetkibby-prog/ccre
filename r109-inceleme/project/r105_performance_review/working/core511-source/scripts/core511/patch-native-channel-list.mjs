import {parse} from '../perf-r11/tests/parser.mjs';
import {createHash} from 'node:crypto';
const hash=value=>createHash('sha256').update(value).digest('hex');

export function patchNativeChannelList(source){
 const ast=parse(source,{ecmaVersion:'latest',sourceType:'module'}),f=ast.body.find(n=>n.id?.name==='GET$24'),body=f?.body.body[0]?.block?.body;
 if(!body||source.slice(body[0].start,body[0].end)!=='const auth504=await requireGameSession(request);'||body.at(-1).type!=='ReturnStatement'||!source.slice(body[1].start,body.at(-1).end).includes('channels: Array.from({ length: 3 }'))throw Error('native_channel_list_changed');
 const edit={start:body[1].start,end:body.at(-1).end,original:source.slice(body[1].start,body.at(-1).end),replacement:'return Response.json(await db().core511Bootstrap.channels(auth504));'};
 const output=source.slice(0,edit.start)+edit.replacement+source.slice(edit.end);parse(output,{ecmaVersion:'latest',sourceType:'module'});return {source:output,proof:{sourceSha256:hash(source),patchedSha256:hash(output),edits:[edit],scope:'Native channel listing after unchanged authorization uses four actual admission counts/cap25 and current-owner reconnect semantics; native feature/occupancy/eligibility helpers retained'}};
}

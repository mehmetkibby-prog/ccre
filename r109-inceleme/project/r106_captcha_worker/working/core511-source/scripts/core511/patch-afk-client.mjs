import {parse} from '../perf-r11/tests/parser.mjs';
import {createHash} from 'node:crypto';
const sha=value=>createHash('sha256').update(value).digest('hex');
// Exact incremental patch of the released R31 client. No economy, movement,
// combat or existing modal function is replaced.
export function patchAfkClient(source,bridge){
 if(!/^core511-afk-r32-[a-f0-9]{16}\.js$/.test(bridge))throw Error('afk_client_bridge_name');
 const head=`import {createAfkUI as createAfkUIR32} from './${bridge}';\n`,tail='\nconst afkUIR32=createAfkUIR32(R,{Portal:Ia.createPortal});\n';
 const from='Ea2 && X2 && R.createElement(mistLootUIR31.Entry,',to='Ea2 && X2 && R.createElement(afkUIR32.Entry,{world:U2,own:X2,post:Q}),Ea2 && X2 && R.createElement(mistLootUIR31.Entry,';
 if(source.split(from).length!==2)throw Error('afk_client_anchor_changed');
 const output=head+source.replace(from,to)+tail;parse(output,{ecmaVersion:'latest',sourceType:'module'});
 return {source:output,proof:{sourceSha256:sha(source),patchedSha256:sha(output),bridge,edits:[{position:'prepend',from:'',to:head},{from,to,count:1},{position:'append',from:'',to:tail}],scope:'R32 nonmodal four-image verification card and recovery; server-owned state only.'}};
}

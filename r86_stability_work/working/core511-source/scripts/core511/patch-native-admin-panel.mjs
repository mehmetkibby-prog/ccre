import {parse} from '../perf-r11/tests/parser.mjs';
import {createHash} from 'node:crypto';
import {kernelMetricsCard511} from './admin-panel.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex');

// The pinned V510 browser bundle remains the application. Only its existing
// load-panel factory is extended; all polling, visibility, abort, profiler
// start/status/download, cooldown UI and other admin controls stay unchanged.
export function patchNativeAdminPanel(source){
 const ast=parse(source,{ecmaVersion:'latest',sourceType:'module'}),node=ast.body.find(n=>n.type==='FunctionDeclaration'&&n.id.name==='createLoadUI430');if(!node)throw Error('native_admin_panel_missing');
 const original=source.slice(node.start,node.end);let body=original;const edits=[];
 const replace=(from,to)=>{if(body.split(from).length!==2)throw Error('native_admin_panel_changed:'+from.slice(0,55));body=body.replace(from,to);edits.push({from,to});};
 replace("const label=state.target==='main'?'Ana işlem':/^channel-[1-3]$/.test(state.target??'')?'Kanal '+state.target.slice(-1):'';","const label=state.target==='main'?'Ana işlem':state.target==='world'?'Ortak dünya':/^channel-[1-4]$/.test(state.target??'')?'Kanal '+state.target.slice(-1):'';");
 replace("h('option',{value:'main'},'Ana işlem'),...[1,2,3].map", "h('option',{value:'main'},'Ana işlem'),h('option',{value:'world'},'Ortak dünya'),...[1,2,3,4].map");
 replace("[{key:'main',label:'Ana işlem'},...[1,2,3].map(i=>({key:'channel-'+i,label:'Kanal '+i})),{key:'realtime',label:'Realtime'}]", "[{key:'main',label:'Ana işlem'},{key:'world',label:'Ortak dünya'},...[1,2,3,4].map(i=>({key:'channel-'+i,label:'Kanal '+i}))]");
 replace('Ana işlem, her kanal ve realtime ayrı ölçülür.', 'Ana işlem, ortak dünya ve dört kanal ayrı ölçülür.');
 replace("h('div',{className:'col-load430-grid'},...rows.map", "h('div',{className:'col-load430-grid',style:{gridTemplateColumns:'repeat(auto-fit,minmax(min(100%,260px),1fr))'}},...rows.map");
 replace('colSlowWorkCard504(h,r,data?.flags504,data?.measuredAtMs,fmt)', 'kernelMetricsCard511(h,r,fmt),colSlowWorkCard504(h,r,data?.flags504,data?.measuredAtMs,fmt)');
 const helper=kernelMetricsCard511.toString();body=body.slice(0,body.indexOf('\n')+1)+helper+'\n'+body.slice(body.indexOf('\n')+1);
 const output=source.slice(0,node.start)+body+source.slice(node.end);parse(output,{ecmaVersion:'latest',sourceType:'module'});
 return {source:output,proof:{sourceSha256:hash(source),patchedSha256:hash(output),function:'createLoadUI430',nativeFunctionSha256:hash(original),helperSha256:hash(helper),helper,edits,scope:'Only native load-panel factory; original effect/transport/profile code unchanged, world and C4 targets and bounded numeric tick display added'}};
}

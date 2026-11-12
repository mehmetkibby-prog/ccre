import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {parse} from '../../perf-r11/tests/parser.mjs';
import {BASE,hash,manifest} from './helpers.mjs';
import {kernelMetricsCard511} from '../admin-panel.mjs';
import {patchNativeAdminPanel} from '../patch-native-admin-panel.mjs';
const file='dist-vds/client/assets/admin-client-B_LbmWSV-ga4172-v418ws--e510-8225403c2fcc-88ffa15660.js',source=fs.readFileSync(path.join(BASE,file),'utf8');assert.equal(hash(source),manifest.files.find(row=>row.path===file).sha256);
const patched=patchNativeAdminPanel(source);
const ssrFile='dist-vds/server/ssr/assets/admin-client-C3ZrDGH--prereg-1788d7c-e508-2844ff495aa8-bfedf407e3.js',ssr=fs.readFileSync(path.join(BASE,ssrFile),'utf8');assert.equal(hash(ssr),manifest.files.find(row=>row.path===ssrFile).sha256);const patchedSsr=patchNativeAdminPanel(ssr);
const h=(tag,props,...children)=>({tag,props:props??{},children:children.flat().filter(v=>v!==null&&v!==false&&v!==undefined)});
const text=node=>typeof node==='object'?node.children.map(text).join(' '):String(node);
function nodes(node,match){if(!node||typeof node!=='object')return [];return [...(match(node)?[node]:[]),...node.children.flatMap(child=>nodes(child,match))];}
const fmt=n=>n===null||n===undefined?'—':String(n);
function panel(data=null){
 const ast=parse(patched.source,{ecmaVersion:'latest',sourceType:'module'}),node=ast.body.find(n=>n.type==='FunctionDeclaration'&&n.id.name==='createLoadUI430'),code=patched.source.slice(node.start,node.end);let states=[data,''];const effects=[],React={createElement:h,useState:initial=>[states.length?states.shift():initial,()=>{}],useEffect:(effect,deps)=>effects.push({effect,deps})};
 const factory=vm.runInNewContext(code+';createLoadUI430',{colPlayerCount504:row=>row.online504?.count??null,colSlowWorkCard504:()=>null});const {Panel}=factory(React,{fetcher:()=>{throw Error('display fixture does not make requests');}});return {view:Panel(),effects,React,setStates:values=>states=values};
}

test('native panel patch changes only documented display slices and preserves every native effect and profiler transport',()=>{
 for(const [original,result]of [[source,patched],[ssr,patchedSsr]]){let reverted=result.source.replace(result.proof.helper+'\n','');for(const edit of [...result.proof.edits].reverse()){assert.equal(reverted.split(edit.to).length,2);reverted=reverted.replace(edit.to,edit.from);}assert.equal(reverted,original);assert.throws(()=>patchNativeAdminPanel(result.source),/native_admin_panel_changed/);}
 assert.equal(patched.proof.nativeFunctionSha256,patchedSsr.proof.nativeFunctionSha256);assert.equal(patched.proof.helperSha256,patchedSsr.proof.helperSha256);assert.deepEqual(patched.proof.edits,patchedSsr.proof.edits);
});

test('native panel loading state and profiler selector include world and all four channels',()=>{
 const fixture=panel(),articles=nodes(fixture.view,n=>n.tag==='article');assert.equal(articles.length,6);assert.deepEqual(articles.map(n=>nodes(n,e=>e.tag==='strong')[0].children[0]),['Ana işlem','Ortak dünya','Kanal 1','Kanal 2','Kanal 3','Kanal 4']);assert(!text(fixture.view).includes('Realtime'));
 const component=nodes(fixture.view,n=>typeof n.tag==='function')[0];fixture.setStates(['channel-4',{state:'recording',target:'world',endsAtMs:Date.now()+60000},'',false,0]);const profile=component.tag(component.props),select=nodes(profile,n=>n.tag==='select')[0],options=nodes(select,n=>n.tag==='option');assert.deepEqual(options.map(n=>n.props.value),['main','world','channel-1','channel-2','channel-3','channel-4']);assert.equal(select.props.disabled,true);assert(text(profile).includes('Ortak dünya'));assert.equal(fixture.effects.length,2);
});

test('numeric tick card shows measured delays and ten samples while missing data stays unknown',()=>{
 assert.equal(kernelMetricsCard511(h,{key:'main'},fmt),null);assert(text(kernelMetricsCard511(h,{key:'channel-4',kernel511:null},fmt)).includes('bekleniyor'));
 const value={tickP95Ms:8.2,maxTickMs:51.4,messagesPerSecond:123,writerAckP95Ms:7.3,slowest:Array.from({length:15},(_,i)=>({tick:15-i,ms:55-i,actor:'never-display'}))},view=kernelMetricsCard511(h,{key:'channel-4',kernel511:value},fmt);assert(text(view).includes('51.4 ms'));assert(text(view).includes('123'));assert(!text(view).includes('never-display'));assert.equal(nodes(view,n=>n.tag==='li').length,10);assert.equal(nodes(view,n=>n.tag==='li')[0].props.style.color,'#f18380');
 const world=kernelMetricsCard511(h,{key:'world',kernel511:value},fmt);assert(!text(world).includes('Mesaj / sn'));assert(!text(world).includes('Kayıt onayı'));
 const bad=kernelMetricsCard511(h,{key:'channel-1',kernel511:{tickP95Ms:NaN,maxTickMs:-1,messagesPerSecond:null,writerAckP95Ms:Infinity,slowest:[]}},fmt);assert.equal(nodes(bad,n=>n.tag==='dd').filter(n=>text(n).startsWith('—')).length,4);assert(text(bad).includes('Henüz tick örneği yok.'));
});

test('native live panel renders all measured owner cards and preserves unavailable rows',()=>{
 const rows=['main','world','channel-1','channel-2','channel-3','channel-4'].map((key,i)=>({key,label:key,status:i===5?'unavailable':'live',busyPercent:i===5?null:12.5,loopDelayMs:1,memoryMb:80,online504:{count:i===5?null:25},kernel511:key==='main'||i===5?null:{tickP95Ms:4.2,maxTickMs:7,messagesPerSecond:50,writerAckP95Ms:2,slowest:[{tick:1,ms:7}]}})),fixture=panel({rows,measuredAtMs:1000,flags504:{}}),view=fixture.view;
 assert.equal(nodes(view,n=>n.tag==='article').length,6);assert.equal(nodes(view,n=>n.props.className==='col-kernel511-metrics').length,4);const last=nodes(view,n=>n.tag==='article').at(-1);assert(text(last).includes('Ulaşılamıyor'));assert(text(last).includes('Tick ölçümü bekleniyor.'));assert.equal(nodes(view,n=>n.props.className==='col-load430-grid')[0].props.style.gridTemplateColumns,'repeat(auto-fit,minmax(min(100%,260px),1fr))');
});

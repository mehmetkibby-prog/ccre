// Static geometry, virtual DOM and exact native/canvas renderer evidence only.
// Not a real browser / touch or a live VDS acceptance test.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {patchNativeClient} from '../patch-native-client.mjs';
import {ADVENTURE_DOCK,ADVENTURE_DOCK_CSS,adventureDockBounds,adventureTexture,preloadAdventureTextures,isAdventureArea,drawAdventureEnemy} from '../adventure-client.mjs';
import {TOWER_KINDS,drawTowerEnemy,towerImage,towerMotionPose,createTowerUI} from '../tower-client.mjs';
import {mapArea} from '../adventure-maps.mjs';
const core=path.resolve(import.meta.dirname,'..');
const workspace=path.resolve(core,'../../../../../..');
const r18=path.join(workspace,'core511-tower-r18');
const output=process.env.COL_R20_TOWER_EVIDENCE??'/tmp/r20-tower-presentation';fs.mkdirSync(output,{recursive:true});
const proof=JSON.parse(fs.readFileSync(path.join(core,'generated/native-client-proof.json'),'utf8'));
const baseline=fs.readFileSync(path.join(core,'../../../native510-bb3a6cc689c6',proof.file),'utf8');
const patched=patchNativeClient(baseline,'core511-transport-0123456789abcdef.js','core511-tower-0123456789abcdef.js');
const nativeRig=Function('return ('+baseline.slice(baseline.indexOf('function oy('),baseline.indexOf('function sy('))+')')();
const area=(floor)=>mapArea('tower','a'.repeat(32),floor);
const evidence={realBrowser:false,realMobile:false,liveVDS:false,mode:'static geometry, virtual DOM, exact production renderer on native canvas',viewports:[],frames:[]};

test('actual native patch cannot show the forest while a tower floor texture is loading',()=>{
 const edit=patched.proof.tower.edits.find(e=>e.from==='L=le.map??st??');
 assert.equal(edit.to,'L=isAdventureArea511(Fe)?adventureTexture511(Fe):le.map??st??');
 const loaded=[];const saved=globalThis.Image;
 globalThis.Image=class{complete=false;naturalWidth=0;set src(url){this.url=url;loaded.push(this);}};
 const pick=Function('Fe','isAdventureArea511','adventureTexture511','le','st','forest','return '+edit.to.slice(2)+'forest');
 try{
  const forest={name:'forest'},le={map:null};
  assert.equal(pick(area(4),isAdventureArea,adventureTexture,le,null,forest),null);
  assert.equal(loaded.length,1);assert.match(loaded[0].url,/floor-4\.webp$/);
  for(let frame=0;frame<120;frame++)assert.equal(pick(area(4),isAdventureArea,adventureTexture,le,null,forest),null);
  assert.equal(loaded.length,1,'no per-frame image requests');
  Object.assign(loaded[0],{complete:true,naturalWidth:1600});
  assert.equal(pick(area(4),isAdventureArea,adventureTexture,le,null,forest),loaded[0]);
  assert.equal(pick('forest',isAdventureArea,adventureTexture,le,null,forest),forest);
  preloadAdventureTextures(area(3));assert.equal(loaded.length,2,'current and next unique texture only');
  preloadAdventureTextures(area(3));assert.equal(loaded.length,2);
  assert(patched.source.includes('drawTowerEnemy511,oy,F.current?.area)'),'native three-part rig reaches adventure renderer');
  assert(patched.source.includes('isAdventureArea511($)?null:la?(0,z.jsx)(Ep,'),'forest objective hidden only in adventure');
 }finally{globalThis.Image=saved;}
});

test('compact expedition dock remains within safe middle band on desktop and mobile geometries',()=>{
 const overlap=(a,b)=>a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y;
 for(const [width,height] of [[1920,1080],[1366,768],[844,390],[390,844]]){
  const dock=adventureDockBounds(width,height,true);
  // Explicit reserved HUD envelopes. This checks CSS geometry, not browser layout.
  const top={x:0,y:0,width,height:height<450?130:190};
  const bottom={x:0,y:height-(height<450?120:230),width,height:height<450?120:230};
  const left={x:0,y:top.height,width:Math.min(330,width*.55),height:height-top.height-bottom.height};
  assert.equal(dock.width,96);assert.equal(dock.height,94);assert.equal(ADVENTURE_DOCK.buttonHeight,44);
  assert(dock.x>=0&&dock.x+dock.width<=width&&dock.y>=0&&dock.y+dock.height<=height);
  for(const reserved of [top,bottom,left])assert.equal(overlap(dock,reserved),false);
  const chat={x:width-Math.min(360,width-16)-8,y:height-Math.min(240,height-16)-8,width:Math.min(360,width-16),height:Math.min(240,height-16)};
  const withChat=adventureDockBounds(width,height,true,true);assert.equal(overlap(withChat,chat),false);assert.equal(overlap(withChat,left),false);
  evidence.viewports.push({width,height,dock,chatOpenDock:withChat,reserved:{top,bottom,left,chat},overlap:false});
 }
 assert.match(ADVENTURE_DOCK_CSS,/top:50%;transform:translateY\(-50%\)/);
 assert.match(ADVENTURE_DOCK_CSS,/width:96px/);
 assert.match(ADVENTURE_DOCK_CSS,/height:44px/);
});

 test('missing profile is held only for adventure IDs in an adventure area, with visible HP/name',()=>{
  const operations=[];const ctx=new Proxy({},{get:(_,key)=>typeof key==='string'?((...args)=>operations.push([key,...args])):undefined,set:()=>true});
  const mob={id:'curuk-adv-'+ 'a'.repeat(32),x:20,y:30,hp:40,max_hp:100,name:'Zincirli Nöbetçi'};
  const render=(enemy,where)=>drawAdventureEnemy(ctx,enemy,null,false,0,false,0,0,{x:0,y:0},()=>{throw Error('no sprite before profile');},null,where);
  assert.equal(render(mob,area(1)),true);assert(operations.some(op=>op[0]==='fillText'&&op[1]===mob.name));assert(operations.some(op=>op[0]==='fillRect'));
  assert.equal(render(mob,'forest'),false);assert.equal(render({...mob,id:'curuk-1'},area(1)),false);
 });

test('production expedition component keeps exit reachable, details in dialog and never adds a duplicate native shortcut',async()=>{
 const {Window}=await import(path.join(r18,'tests/tower-browser-deps/node_modules/happy-dom/lib/index.js'));
 const window=new Window({url:'https://r20-tower-fixture.invalid',width:844,height:390});
 for(const key of ['window','document','HTMLElement','Node','Event','MouseEvent','CustomEvent'])globalThis[key]=key==='window'?window:window[key];
 globalThis.IS_REACT_ACT_ENVIRONMENT=true;
 const React=await import(path.join(core,'../../../deps/native/node_modules/react/index.js'));
 const {createRoot}=await import(path.join(core,'../../../deps/native/node_modules/react-dom/client.js'));
 const {createPortal}=await import(path.join(core,'../../../deps/native/node_modules/react-dom/index.js'));
 const {Entry}=createTowerUI(React,{Portal:createPortal});const host=document.createElement('div');document.body.append(host);const renderer=createRoot(host),requests=[];
 const run={kind:'tower',floor:2,name:'Kül Koridoru',wave:2,waves:3,deadline:Date.now()+600000,clear:true,area:area(2)};
 const props={world:{area:area(2),adventure511:{run,portals:[]}},own:{area:area(2),x:100,y:100},post:async(url,data)=>{requests.push({url,data});return {ok:true};}};
 const render=element=>React.act(async()=>renderer.render(element));
 const click=node=>React.act(async()=>node.dispatchEvent(new MouseEvent('click',{bubbles:true})));
 try{
  await render(React.createElement(Entry,props));
  const dock=document.querySelector('.tower20-dock');assert(dock);assert.equal(dock.parentElement,document.body,'fixed dock escapes native scaled world-actions ancestor');assert.equal(dock.querySelectorAll('button').length,2);assert.equal(dock.querySelectorAll('p').length,0);
  assert.equal(host.querySelector('.dungeon-shortcut'),null);assert.equal(host.querySelector('[role=dialog]'),null);
  await click(dock.querySelector('button'));
  const dialog=host.querySelector('[role=dialog]');assert(dialog);assert.match(dialog.textContent,/Dalga 2 \/ 3/);assert.match(dialog.textContent,/Sonraki kata geç/);
  await click([...dialog.querySelectorAll('button')].find(b=>b.textContent==='Sonraki kata geç'));
  assert.equal(requests.at(-1).data.action,'adventure_next');assert.match(requests.at(-1).data.requestId,/^[0-9a-f-]{36}$/);
  await click(dock.querySelector('.tower20-leave'));
  assert.equal(requests.at(-1).data.action,'adventure_leave');assert.equal(host.querySelector('[role=dialog]'),null);
  fs.writeFileSync(path.join(output,'production-expedition-dom.html'),document.body.innerHTML);
  await render(React.createElement(Entry,{...props,world:{area:'bazaar',adventure511:{portals:[]}},own:{area:'bazaar'}}));
  assert.equal(document.querySelector('.tower20-dock'),null);assert.equal(host.querySelector('.dungeon-shortcut'),null);
 }finally{await React.act(async()=>renderer.unmount());window.happyDOM.abort();}
});

test('all seven original tower sprites render bounded native-style idle, walk and attack frames',async()=>{
 const {createCanvas,loadImage}=await import(path.join(r18,'tests/tower-browser-deps/node_modules/@napi-rs/canvas/index.js'));
 const sprite=await loadImage(path.join(r18,'public-assets/tower-r18/enemies.webp'));
 globalThis.Image=function(){Object.defineProperty(sprite,'src',{get:()=>'',set:()=>{}});return sprite;};
 assert(towerImage('/assets/tower-r18/enemies.webp'));
 const poses=[{label:'Idle',now:0,moving:false,attack:0,travel:0},{label:'Walk 1',now:190,moving:true,attack:0,travel:19.5},{label:'Walk 2',now:380,moving:true,attack:0,travel:58.5},{label:'Attack',now:500,moving:false,attack:.5,travel:0}];
 let rigCalls=0;const rig=(...args)=>{rigCalls++;return nativeRig(...args);};
 for(const kind of Object.keys(TOWER_KINDS)){
  const canvas=createCanvas(1200,400),ctx=canvas.getContext('2d');ctx.fillStyle='#08140f';ctx.fillRect(0,0,1200,400);ctx.fillStyle='#e6d0a1';ctx.font='14px sans-serif';ctx.fillText('R20 '+TOWER_KINDS[kind]+' — exact native rig on Node canvas; not a browser capture',12,24);
  const hashes=[];
  for(let index=0;index<poses.length;index++){
   const p=poses[index],tile=createCanvas(300,350),c=tile.getContext('2d');
   const enemy={id:'tower-fixture',x:150,y:320,name:TOWER_KINDS[kind],hp:75,max_hp:100};
   assert.equal(drawAdventureEnemy(c,enemy,{feature:'tower',kind},true,p.now,p.moving,p.attack,p.travel,{x:-1,y:0},drawTowerEnemy,rig),true);
   hashes.push(createHash('sha256').update(tile.toBuffer('image/png')).digest('hex'));ctx.drawImage(tile,index*300,40);ctx.fillText(p.label,index*300+14,385);
  }
  assert(new Set(hashes).size>=3,'visible poses for '+kind);
  evidence.frames.push({kind,hashes,distinct:new Set(hashes).size});fs.writeFileSync(path.join(output,kind+'-native-rig.png'),canvas.toBuffer('image/png'));
 }
 assert.equal(rigCalls,6*4,'one native rig call per mobile/boss sprite; stone remains stationary');
 const left=towerMotionPose('guard',100,true,0,19.5),right=towerMotionPose('guard',100,true,0,58.5);assert(left.upperX>0&&right.upperX<0);assert(left.middleX<0&&right.middleX>0);
 fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(evidence,null,2)+'\n');
});

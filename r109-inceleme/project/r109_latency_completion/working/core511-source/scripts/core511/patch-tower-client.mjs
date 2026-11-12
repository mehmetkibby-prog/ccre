import {parse} from '../perf-r11/tests/parser.mjs';
import {createHash} from 'node:crypto';
const hash=s=>createHash('sha256').update(s).digest('hex');
// Both the mobile button and Space/1 call the native prepare callback before
// starting their one-target hold. Adventure maps must acquire a nearby target
// there, with the same native range, visibility and alive checks as the forest.
// Keep the hold/death latch untouched: this runs only on a fresh physical press.
export function patchAdventureTargetingClient(source){
 const from='if(!e||W.current?.run||!["dragon","ancient","forest","frozen","sanctum","sinsi","black","afk","rune","rune_v2","event"].includes(e.area))return!0;',
 to='if(!e||W.current?.run||!isAdventureArea511(e.area)&&!["dragon","ancient","forest","frozen","sanctum","sinsi","black","afk","rune","rune_v2","event"].includes(e.area))return!0;';
 const at=source.indexOf(from);
 if(at<0||source.indexOf(from,at+from.length)>=0)throw Error('adventure_attack_prepare_anchor_changed');
 const output=source.slice(0,at)+to+source.slice(at+from.length);
 return{source:output,proof:{sourceSha256:hash(source),patchedSha256:hash(output),edits:[{from,to}],scope:'Enable native nearby-monster acquisition in adventure maps; native class ranges, target filters and physical hold death latch unchanged.'}};
}
export function patchTowerClient(source,bridge){
 if(!/^core511-tower-[a-f0-9]{16}\.js$/.test(bridge))throw Error('tower_bridge_name');
 const edits=[];let output=source;
 const one=(from,to)=>{const at=output.indexOf(from);if(at<0||output.indexOf(from,at+from.length)>=0)throw Error('tower_client_anchor_changed:'+from.slice(0,100));output=output.slice(0,at)+to+output.slice(at+from.length);edits.push({from,to});};
 output=`import {createTowerUI as createTower511,drawTowerEntrance as drawTowerEntrance511,towerEntranceHit as towerHit511,TOWER_ENTRANCE as towerDoor511,drawTowerEnemy as drawTowerEnemy511,drawTowerLoot as drawTowerLoot511,towerMap as towerMap511,towerMapTexture as towerTexture511,isAdventureArea as isAdventureArea511,isMistArea as isMistArea511,ADVENTURE_BOUNDS as adventureBounds511,adventureSegment as adventureSegment511,adventureTexture as adventureTexture511,adventureLabel as adventureLabel511,adventureProfile as adventureProfile511,drawAdventureScene as drawAdventureScene511,drawAdventureEnemy as drawAdventureEnemy511} from './${bridge}';\n`+output;
 one('Ze&&e(ap.x,ap.y)&&lt.push({y:ap.y,draw:()=>cp(n,a)})','Ze&&e(towerDoor511.x,towerDoor511.y,440)&&lt.push({y:towerDoor511.y,draw:()=>drawTowerEntrance511(n,a)}),Ze&&e(ap.x,ap.y)&&lt.push({y:ap.y,draw:()=>cp(n,a)})');
 one('else if(a?.area===`bazaar`){if(Math.abs(n-s_.x)',"else if(a?.area===`bazaar`){if(towerHit511(n,r)){vi.current=null;window.dispatchEvent(new Event('tower-open'));Y('ui');return}if(Math.abs(n-s_.x)");
 one('Zs===`adventure`&&(0,z.jsxs)(`div`,{className:`teleport-grid`,children:[',"Zs===`adventure`&&(0,z.jsxs)(`div`,{className:`teleport-grid`,children:[R.createElement('button',{className:'tower18-destination',onClick:()=>{Xs(false);window.dispatchEvent(new Event('tower-open'));}},R.createElement('span',{className:'teleport-icon'},'♜'),R.createElement('span',null,R.createElement('strong',null,'Kadim Kulesi'),R.createElement('small',null,'10 kat · Dalgalar, Sinsi Taşlar ve Azrail')),R.createElement('b',null,'İNCELE')),");
 one('function colOpenPvp483(area) {',"function colOpenPvp483(area) {if(isMistArea511(area))return true;");
 one("at=rt||it||nt||Fe==='rune_v2'","at=rt||it||nt||Fe==='rune_v2'||isMistArea511(Fe)");
 one('a?.area===`black`||a?.area===`afk`){let e=a?.monsters', 'a?.area===`black`||a?.area===`afk`||isAdventureArea511(a?.area)){let e=a?.monsters');
 one("w.current>0&&[\"dragon\",\"ancient\",\"forest\",\"frozen\",\"sanctum\",\"sinsi\",\"war\",\"black\",\"arena\",\"afk\",\"rune\",\"rune_v2\",\"event\"].includes(F.current?.area??``)","w.current>0&&(isAdventureArea511(F.current?.area)||[\"dragon\",\"ancient\",\"forest\",\"frozen\",\"sanctum\",\"sinsi\",\"war\",\"black\",\"arena\",\"afk\",\"rune\",\"rune_v2\",\"event\"].includes(F.current?.area??``))");
 one("if((i.area==='event'||(colRuneCoast483(i.area)||","if((isAdventureArea511(i.area)||i.area==='event'||(colRuneCoast483(i.area)||");
 one('bt as ve,','bt as nativeAreaBounds511,');
 one('Ct as d,','Ct as nativeAreaSegment511,');
 one('function Ev(e,t,n){',"function Ev(e,t,n){if(isAdventureArea511(e)){const bounds=adventureBoundsFor511(e);return {x:Math.max(80,Math.min(bounds.width-80,n.x)),y:Math.max(100,Math.min(bounds.height-80,n.y))};}");
 one('L=le.map??st??','L=isAdventureArea511(Fe)?adventureTexture511(Fe):le.map??st??');
 one('let lt=te;if(lt.length=0,le.run)',"drawAdventureScene511(n,F.current,xp(),(x,y,r=200)=>jv(x,y,B.current.x,B.current.y,Be,Ve,r));let lt=te;if(lt.length=0,le.run)");
 one('const colEventKind444=colEventBossKind444(t);',"const colEventKind444=colEventBossKind444(t),adventureMob511=adventureProfile511(F.current,t.id);");
 one('l=Vg(t.id),control494=',"l=Vg(t.id)||adventureMob511?.stationary===true,control494=");
 one('let e=c?68:(t.is_boss||!!colEventKind444)||o?74:f?96:t.variant===`katil`?155:t.variant===`agresif`?132:108;',"let e=adventureMob511?.speed??(c?68:(t.is_boss||!!colEventKind444)||o?74:f?96:t.variant===`katil`?155:t.variant===`agresif`?132:108);");
 one("lt.push({y:e.y,draw:()=>(colEventKind444==='world'?", "lt.push({y:e.y,draw:()=>(drawAdventureEnemy511(n,i,adventureMob511,_r.current===t.id,a,S,E,r.travel,x,drawTowerEnemy511,towerNativeRig511,F.current?.area)?void 0:colEventKind444==='world'?");
 one('&&d.area!==`afk`){K(d.area===`fishing`',"&&d.area!==`afk`&&!isAdventureArea511(d.area)){K(d.area===`fishing`");
 one('&&$!==`afk`,"aria-label"', '&&$!==`afk`&&!isAdventureArea511($),"aria-label"');
 one('||$===`afk`||kf&&$!==`fishing`', '||$===`afk`||isAdventureArea511($)||kf&&$!==`fishing`');
 one('s=colRuneCoast483(t)?t:', 's=isAdventureArea511(t)?t:colRuneCoast483(t)?t:');
 one('a=t.area===`bazaar`?`bazaar`:', 'a=isAdventureArea511(t.area)?t.area:t.area===`bazaar`?`bazaar`:');
 // Adventure maps retain the native HUD, health and quest entry points. Hide only
 // the default forest objective / forest boss ribbon and incorrect first-step prompt.
 one('la?(0,z.jsx)(Ep,{run:la,playerId:Bo}):', 'isAdventureArea511($)?null:la?(0,z.jsx)(Ep,{run:la,playerId:Bo}):');
 one('$!==`arena`&&(!la||la.stage===3)&&($===`afk`?', '$!==`arena`&&!isAdventureArea511($)&&(!la||la.stage===3)&&($===`afk`?');
 one('(0,z.jsx)(xf,{step:$s.step,area:', '(0,z.jsx)(xf,{step:isAdventureArea511($)?3:$s.step,area:');
 one('la?vp[la.stage]?.name:', 'isAdventureArea511($)?adventureLabel511($):la?vp[la.stage]?.name:');
 one('la?`ÇEKİRDEĞİN KALBİ · BÖLGE GÖREVİ`:', "isAdventureArea511($)?(isMistArea511($)?'SİS YARIĞI · PVP AÇIK':'KADİM KULESİ · KAT GÖREVİ'):la?`ÇEKİRDEĞİN KALBİ · BÖLGE GÖREVİ`:");
 one('Ea&&X&&(0,z.jsx)(Tp,{uiSuspended:Xo,',"Ea&&X&&R.createElement(tower511.Entry,{world:U,own:X,post:Q,uiSuspended:Xo,onTravel:()=>Wb('bazaar'),onChange:()=>{I.current=true;Ce.current(true)}}),Ea&&X&&(0,z.jsx)(Tp,{uiSuspended:Xo,");
 output=output.replace('ADVENTURE_BOUNDS as adventureBounds511,','ADVENTURE_BOUNDS as adventureBounds511,adventureBounds as adventureBoundsFor511,');
 output+='\nfunction towerNativeRig511(...args){return oy(...args)}\nfunction ve(area){return isAdventureArea511(area)?adventureBoundsFor511(area):nativeAreaBounds511(area)}function d(area,...args){return isAdventureArea511(area)?adventureSegment511(area,...args):nativeAreaSegment511(area,...args)}const tower511=createTower511(R,{Dialog:It,Content:kt,Header:Pt,Title:jt,Description:Ct,Portal:Ia.createPortal});\n';
 const targeting=patchAdventureTargetingClient(output);output=targeting.source;edits.push(...targeting.proof.edits);
 parse(output,{ecmaVersion:'latest',sourceType:'module'});return{source:output,proof:{sourceSha256:hash(source),patchedSha256:hash(output),bridge,edits}};
}
export function patchTowerAdmin(source,bridge){
 if(!/^core511-tower-[a-f0-9]{16}\.js$/.test(bridge))throw Error('tower_bridge_name');let output=source;const edits=[];
 const one=(from,to)=>{const at=output.indexOf(from);if(at<0||output.indexOf(from,at+from.length)>=0)throw Error('tower_admin_anchor_changed:'+from.slice(0,100));output=output.slice(0,at)+to+output.slice(at+from.length);edits.push({from,to});};
 output=`import {createTowerUI as createTower511} from './${bridge}';\n`+output;
 one('let t=await fetch(`/api/admin`,{method:`POST`,headers:',"let t=await fetch(e.action.startsWith('sis_mist_')?'/api/admin?core511=mist':e.action==='kadim_tower_get'||e.action==='kadim_tower_save'?'/api/admin?core511=tower':`/api/admin`,{method:`POST`,headers:");
 one('if(!t.ok){let e=i.errors?.length?i.errors.join(` `):i.error;',"if(!t.ok){if(colSecurityBody508.action.startsWith('sis_mist_'))throw Object.assign(Error(i.errors?.length?i.errors.join(' '):i.error??'Sis Yarığı işlemi tamamlanamadı.'),{status:t.status,payload:i});let e=i.errors?.length?i.errors.join(` `):i.error;");
 one('catch(e){colSecurityNotice508(colSecurityBody508,null,e);return C(',"catch(e){colSecurityNotice508(colSecurityBody508,null,e);if(colSecurityBody508.action.startsWith('sis_mist_')){C(e instanceof Error?e.message:'Sis Yarığı işlemi tamamlanamadı.');throw e;}return C(");
 one('{id:`overview`,label:`Genel Bakış`',"{id:'sis_mist',label:'Sis Yarığı',note:'Portallar, düşmanlar ve ödüller',icon:(0,Z.jsx)(p,{})},{id:'kadim_tower',label:'Kadim Kulesi',note:'10 kat, düşmanlar ve ganimetler',icon:(0,Z.jsx)(p,{})},{id:`overview`,label:`Genel Bakış`");
 one('children:[n===`overview`&&(0,Z.jsxs)(`section`,{className:`admin-card admin-overview-card`',"children:[n==='sis_mist'&&X.createElement(tower511Admin.MistAdmin,{act:q,busy:T}),n==='kadim_tower'&&X.createElement(tower511Admin.Admin,{act:q,busy:T}),n===`overview`&&(0,Z.jsxs)(`section`,{className:`admin-card admin-overview-card`");
 output+='\nconst tower511Admin=createTower511(X);\n';parse(output,{ecmaVersion:'latest',sourceType:'module'});return{source:output,proof:{sourceSha256:hash(source),patchedSha256:hash(output),bridge,edits}};
}

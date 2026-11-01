import {createHash} from 'node:crypto';
import {parse} from '../perf-r11/tests/parser.mjs';
import {createMaterialGrantAdminR55} from './admin-material-client-r55.mjs';
import {createMountDropsAdminR55} from './admin-mount-drops-client-r55.mjs';
import {ADMIN_MATERIALS_R55} from './admin-materials-r55.mjs';
import {MOUNT_DROP_DEFAULTS_R55} from './mount-drops-r55.mjs';
const hash=s=>createHash('sha256').update(s).digest('hex');
function patcher(source){let output=source;const edits=[];return{one(from,to,count=1){if(output.split(from).length-1!==count)throw Error('r55_client_anchor_changed:'+from.slice(0,80));output=output.split(from).join(to);edits.push({from,to,count});},finish(){parse(output,{ecmaVersion:'latest',sourceType:'module'});return {source:output,proof:{sourceSha256:hash(source),patchedSha256:hash(output),edits}};},get source(){return output;}};}
export function patchGameR55(source,{oldBridge,newBridge,baselineProof}){
 const p=patcher(source);p.one(oldBridge,newBridge);
 p.one('MOUNT_NPC_R49} from','MOUNT_NPC_R49,createGameplayUIR55,loadMountOptionsR49,clientGameplayR55,dungeonMotionR55} from');
 p.one('R.createElement(colUiStyles500, { React: R }),','R.createElement(colUiStyles500, { React: R }), R.createElement(colGameplayUIR55),');
 p.one('iphoneDock477 && node.classList.contains("combat-dock") ?','iphoneDock477 && !clientGameplayR55.mobileExperience && node.classList.contains("combat-dock") ?');
 p.one('() => W2.current.sync()','() => clientGameplayR55.dungeonProgress ? {...W2.current.sync(),stream:true} : W2.current.sync()');
 const ast=parse(p.source,{ecmaVersion:'latest',sourceType:'module'});let smooth;
 function walk(n){if(!n||typeof n!=='object')return;if(n.type==='VariableDeclarator'&&n.id?.name==='Sp'&&n.init?.type==='ClassExpression')smooth=n.init;for(const v of Object.values(n))if(Array.isArray(v))v.forEach(walk);else if(v?.type)walk(v);}walk(ast);
 const native=baselineProof.edits.find(e=>e.replacement?.includes('segment={x,y,tx:x'))?.original;
 if(!smooth||!native?.startsWith('class{travel=0;epoch=0;error='))throw Error('r55_dungeon_native_motion_proof_missing');
 const legacy=p.source.slice(smooth.start,smooth.end);p.one(legacy,'dungeonMotionR55('+legacy+','+native+')');
 p.one('const colMountRendererR49=createMountRendererR49(', 'const colGameplayUIR55=createGameplayUIR55(R,loadMountOptionsR49);\nconst colMountRendererR49=createMountRendererR49(');
 return p.finish();
}
export function patchAdminR55(source){
 const p=patcher(source),catalog=ADMIN_MATERIALS_R55.map(x=>({kind:x.id,label:x.name,cap:x.cap}));
 p.one('var X = e(t(), 1), Z = n();','var X = e(t(), 1), Z = n();\nconst colMaterialGrantR55=('+createMaterialGrantAdminR55.toString()+')(X,'+JSON.stringify(catalog)+');\nconst colMountDropsR55=('+createMountDropsAdminR55.toString()+')(X,'+JSON.stringify(MOUNT_DROP_DEFAULTS_R55)+');');
 p.one('fetch(e3.action === "grant_mount_material_r49" ?', 'fetch(e3.action === "grant_enhancement_material_r55" || e3.action.startsWith("mount_drop_") ? "/api/admin?core511=gameplay-r55" : e3.action === "grant_mount_material_r49" ?');
 p.one('colSecurityBody508.action === "grant_mount_material_r49"','colSecurityBody508.action === "grant_mount_material_r49" || colSecurityBody508.action === "grant_enhancement_material_r55" || colSecurityBody508.action.startsWith("mount_drop_")',2);
 const player='X.createElement(colMountGrantR49, { player: d2.players.find((e3) => e3.id === R2), busy: T2, act: q2 })';
 p.one(player,player+', X.createElement(colMaterialGrantR55, {player:d2.players.find(e3=>e3.id===R2),busy:T2,act:q2})');
 p.one('{ id: `overview`, label:', '{ id:"mount_r55",label:"Binek",note:"Malzeme haritaları ve düşme oranları",icon:(0,Z.jsx)(p,{}) }, { id: `overview`, label:');
 const ast=parse(p.source,{ecmaVersion:'latest',sourceType:'module'});let navName;
 const walk=n=>{if(!n||typeof n!=='object')return;if(n.type==='VariableDeclarator'&&n.init?.type==='ArrayExpression'&&n.init.elements.some(e=>e?.type==='ObjectExpression'&&e.properties.some(p=>p.key?.name==='id'&&p.value?.value==='mount_r55')))navName=n.id.name;for(const v of Object.values(n))if(Array.isArray(v))v.forEach(walk);else if(v?.type)walk(v);};walk(ast);if(!navName)throw Error('r55_admin_nav_missing');
 p.one('function an({ email: e2, signOutPath: t2 }) {',`function an({ email: e2, signOutPath: t2 }) {
 const [colR55AdminFlags,colR55SetFlags]=X.useState({});X.useEffect(()=>{let alive=true;const c=new AbortController(),timer=setTimeout(()=>c.abort(),5000);fetch('/api/core511-r49-options',{cache:'no-store',credentials:'same-origin',signal:c.signal}).then(r=>r.ok?r.json():{}).then(v=>{if(alive)colR55SetFlags(v.gameplayR55??{});}).catch(()=>{}).finally(()=>clearTimeout(timer));return()=>{alive=false;c.abort();clearTimeout(timer);};},[]);`);
 p.one(navName+'.map(',navName+'.filter(row=>row.id!=="mount_r55"||colR55AdminFlags.mountDrops===true).map(');
 p.one('children: [n2 === "sis_mist"','children: [n2 === "mount_r55" && colR55AdminFlags.mountDrops === true && X.createElement(colMountDropsR55,{act:q2,busy:T2}), n2 === "sis_mist"');
 return p.finish();
}
export function reverseR55Client(source,proof){let result=source;for(const e of [...proof.edits].reverse()){if(result.split(e.to).length-1!==e.count)throw Error('r55_reverse_count');result=result.split(e.to).join(e.from);}if(hash(result)!==proof.sourceSha256)throw Error('r55_reverse_sha');return result;}

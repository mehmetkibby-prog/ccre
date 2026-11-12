import {createHash} from 'node:crypto';
import {parse} from '../perf-r11/tests/parser.mjs';
import {createMaterialGrantAdminR55} from './admin-material-client-r55.mjs';
import {ADMIN_ACCESSORIES_R58} from './admin-accessories-r58.mjs';
const hash=s=>createHash('sha256').update(s).digest('hex');
function patcher(source){let output=source;const edits=[];return{one(from,to,count=1){if(output.split(from).length-1!==count)throw Error('r58_client_anchor_changed:'+from.slice(0,100));output=output.split(from).join(to);edits.push({from,to,count});},finish(){parse(output,{ecmaVersion:'latest',sourceType:'module'});return {source:output,proof:{sourceSha256:hash(source),patchedSha256:hash(output),edits}};}};}
export function patchGameR58(source,{oldBridge,newBridge}){
 const p=patcher(source);p.one(oldBridge,newBridge);
 p.one('clientGameplayR55,dungeonMotionR55} from','clientGameplayR55,dungeonMotionR55,clientGameplayR58,mountedSkillBlockedR58,mountedHandR58,dungeonSnapshotR58,dungeonAttackR58} from');
 // One common input handler already owns PC 1/Space and the mobile attack button.
 p.one('    cancelMistLootR31("attack");','    if(mountedSkillBlockedR58(F2.current?.players.find(p=>p.id===g2.current),e4)){K2("Binek üzerinde yalnız düz vuruş yapabilirsin. Yetenek için in.");return;}\n    cancelMistLootR31("attack");');
 p.one('const colMountedR49=c2>0&&!l2&&!A2?.active?colMountRendererR49.pose(colMountR49,s2,m2,f2.x):null;', 'const colMountedR49=c2>0&&(clientGameplayR58.mountRender||!l2&&!A2?.active)?colMountRendererR49.pose(colMountR49,s2,m2,f2.x,(l2||A2?.active)?Math.max(0,Math.min(1,A2?.phase??(m2-h2)/(eu[g2]??eu[0]))):0,!!(l2||A2?.active)):null;');
 p.one('pumpkin499: colPumpkin499 }) : false;', 'pumpkin499: colPumpkin499, mountedR58:clientGameplayR58.mountRender?colMountedR49:null }) : false;');
 p.one('const hand = ey(role, x2, y2, frame, direction.x);','const hand = pose?.mountedR58?mountedHandR58(role,x2,y2,frame,direction.x,pose.mountedR58):ey(role, x2, y2, frame, direction.x);');
 p.one('if (walkHand) {','if (walkHand && !pose?.mountedR58) {');
 p.one('const syncedAttackPhase = pose?.moving ?', 'const syncedAttackPhase = pose?.mountedR58?Math.max(0,Math.min(1,pose.attackPhase??0)):pose?.moving ?');
 p.one('role, x2, y2, pose, ey, colGuardianSwordSwing481, El);','role, x2, y2, pose, pose?.mountedR58?((r,x,y,f,d)=>mountedHandR58(r,x,y,f,d,pose.mountedR58)):ey, colGuardianSwordSwing481, El);');
 // A short command ACK carries no room. Never refresh prediction from old data.
 p.one('  function O2(e4) {\n    if (e4.run', '  function O2(e4) {\n    if(!dungeonSnapshotR58(e4)){if(e4.notice)u2(e4.notice);return;}\n    if (e4.run');
 p.one('  accept(e3, t2, n2 = performance.now()) {\n    if (e3.run', '  accept(e3, t2, n2 = performance.now()) {\n    if(!dungeonSnapshotR58(e3))return false;\n    if (e3.run');
 // Basic attack from the keyboard/mobile button acquires and approaches a target.
 p.one('  attack(e3) {\n    if (!(!this.me', '  attack(e3) {\n    if(clientGameplayR58.dungeonWorldControls)return dungeonAttackR58(this,e3);\n    if (!(!this.me');
 p.one('nu(a2.role, 0) - 50', 'nu(a2.role, clientGameplayR58.dungeonWorldControls?(this.queued??0):0) - 50');
 // Compact collection ACKs must not be interpreted as leaving the room either.
 p.one('fa2(await Q(`/api/dungeon`, { action: `collect`, runId: e4.run.id, attempt: e4.run.attempt }))','((reply)=>{if(dungeonSnapshotR58(reply))fa2(reply);})(await Q(`/api/dungeon`, { action: `collect`, runId: e4.run.id, attempt: e4.run.attempt }))');
 // Display actual Sis monster rewards instead of the native forest-ID fallback.
 p.one('    let t3 = Ze(e4);\n    if (!t3)', '    let t3 = clientGameplayR58.mistLevelRewards&&isMistArea511(e4.area)?"adventure.catalog":Ze(e4);\n    if (!t3)');
 return p.finish();
}
export function patchAdminR58(source){
 const p=patcher(source),catalog=ADMIN_ACCESSORIES_R58.map(x=>({kind:x.id,label:x.name,cap:x.cap}));
 p.one('var X = e(t(), 1), Z = n();','var X = e(t(), 1), Z = n();\nconst colAccessoryGrantR58=('+createMaterialGrantAdminR55.toString()+')(X,'+JSON.stringify(catalog)+',{accessories:true,storageKey:"core511.r58.accessoryGrant.pending"});');
 const anchor='X.createElement(colMaterialGrantR55, {player:d2.players.find(e3=>e3.id===R2),busy:T2,act:q2})';
 p.one(anchor,anchor+',X.createElement(colAccessoryGrantR58,{player:d2.players.find(e3=>e3.id===R2),busy:T2,act:q2})');
 return p.finish();
}
export function reverseR58Client(source,proof){let result=source;for(const e of [...proof.edits].reverse()){if(result.split(e.to).length-1!==e.count)throw Error('r58_reverse_count');result=result.split(e.to).join(e.from);}if(hash(result)!==proof.sourceSha256)throw Error('r58_reverse_sha');return result;}

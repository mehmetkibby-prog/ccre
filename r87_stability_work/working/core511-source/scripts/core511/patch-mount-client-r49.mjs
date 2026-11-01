import {createHash} from 'node:crypto';
import {reverseR40Edits} from './patch-r40-client.mjs';
const sha=value=>createHash('sha256').update(value).digest('hex');
/** Only the two player draw call sites, native UI extension hooks, and scalar
 * prediction factor are changed. Reversal proves every original byte remains. */
export function patchMountClientR49(input,helper,{art={}}={}){
 if(!/^core511-mount-r49-[a-f0-9]{16}\.js$/.test(helper))throw Error('mount_client_bridge_name');
 for(const kind of ['wolf','boar','stag']){const src=typeof art[kind]==='string'?art[kind]:art[kind]?.src;if(!/^\/assets\/[a-zA-Z0-9_-]+\.webp$/.test(src??''))throw Error('mount_client_art:'+kind);}
 let source=input;const edits=[];
 const replace=(from,to,count=1,label=from.slice(0,80))=>{const found=source.split(from).length-1;if(found!==count)throw Error('mount49_anchor:'+label+':'+found+'/'+count);source=source.split(from).join(to);edits.push({from,to,count,label});};
 const prefix=`import {createMountUIR49,createMountRendererR49,mountEnabledR49,mountStateR49,mountSpeedR49,suppressMountR49,mountNpcHitR49,mountShortcutR49,MOUNT_NPC_R49} from './${helper}';\n`;
 source=prefix+source;edits.push({position:'prepend',from:'',to:prefix,label:'mount UI and renderer import'});
 replace('(0, z.jsxs)(r40UI.Menu, { className: `world-actions`, children: [','(0, z.jsxs)(r40UI.Menu, { className: `world-actions`, children: [R.createElement(colMountUIR49.Entry,{joined:Ea2,uiSuspended:Xo2}),');
 replace('children: [R.createElement(colBeltUIR31.Host,','children: [R.createElement(colMountUIR49.Host,{key:X2?.id,own:X2,world:U2,joined:Ea2,post:Q,uiSuspended:Xo2,onChanged:async()=>{I2.current=true;await J(true);}}),R.createElement(colBeltUIR31.Host,');
 replace('      if (menuShortcut479(e5, { joined: v2.current, blocked: Yo2.current, editing: Ti2.current, pending: fr2.current })) return;','      if (mountShortcutR49(e5, { joined: v2.current, blocked: Yo2.current, editing: Ti2.current, pending: fr2.current })) return;\n      if (menuShortcut479(e5, { joined: v2.current, blocked: Yo2.current, editing: Ti2.current, pending: fr2.current })) return;');
 replace('speed511 = tu(G2);','speed511 = tu(G2) * mountSpeedR49(own);');
 replace('      ri2.current = s3, ai2.current = e4;','      suppressMountR49(f2);\n      ri2.current = s3, ai2.current = e4;',2,'PvP and PvE local attack dismount');
 replace('        oi2.current = n4, ri2.current = s3, ai2.current = 2,','        suppressMountR49(f2);\n        oi2.current = n4, ri2.current = s3, ai2.current = 2,');
 replace('          const result = await _m2({ action: "cast_support456", ability: 3 }, "magic");','          suppressMountR49(f2);\n          const result = await _m2({ action: "cast_support456", ability: 3 }, "magic");');
 replace('          if (Ze2) {\n            const npc = colExpansionModel456.PAKIZE456;','          if (Ze2) {\n            if(mountEnabledR49()&&e6(MOUNT_NPC_R49.x,MOUNT_NPC_R49.y))lt2.push({y:MOUNT_NPC_R49.y,draw:()=>My(n3,V2.current.heroes,MOUNT_NPC_R49.x,MOUNT_NPC_R49.y,MOUNT_NPC_R49.name,MOUNT_NPC_R49.title,MOUNT_NPC_R49.role,a3)});\n            const npc = colExpansionModel456.PAKIZE456;');
 replace('    const colNpc456 = colNpcHit456(a3, n3, r3, t3);',`    const mountNpcR49=mountNpcHitR49(a3,n3,r3,t3);
    if(mountNpcR49){vi2.current=null;pe2.current=null;Sr2.current?.stop();wr2.current?.stop();e4.preventDefault();if(Math.hypot(b2.current.x-mountNpcR49.x,b2.current.y-mountNpcR49.y)>mountNpcR49.reach){K2("Binek görevi için Seyis Arda’ya yaklaş.");return;}window.dispatchEvent(new Event("mount49-open"));return;}
    const colNpc456 = colNpcHit456(a3, n3, r3, t3);`);
 // Both calls reuse the existing native interpolation and Y sorting exactly.
 replace('colPumpkinActive499(r6, xp2()))','colPumpkinActive499(r6, xp2()), mountStateR49(r6))',2,'own and remote mount argument');
 replace('colTargetSelected487 = false, colPumpkin499 = false) {','colTargetSelected487 = false, colPumpkin499 = false, colMountR49) {\n  const colMountedR49=c2>0&&!l2&&!A2?.active?colMountRendererR49.pose(colMountR49,s2,m2,f2.x):null;\n  if(colMountedR49)s2=false;');
 replace('e3.fill()), o2 && !P2 && (e3.strokeStyle = `rgba(111,241,164,.72)`','e3.fill()), colMountedR49&&colMountRendererR49.animal(e3,colMountedR49,xe2,Se2), o2 && !P2 && (e3.strokeStyle = `rgba(111,241,164,.72)`');
 replace('e3.save(), P2 && (e3.translate(xe2, Se2 + 7)','e3.save(), colMountedR49&&(Se2-=colMountedR49.lift,we2-=colMountedR49.lift), P2 && (e3.translate(xe2, Se2 + 7)');
 const draw='gy(e3, Ne2, a2, Ie2, xe2, Se2 + 28, f2.x, Pe2, s2 && !l2 ? m2 : void 0)';
 const mounted='colMountRendererR49.body(e3,colMountedR49,{image:Ne2,roleIndex:pv(a2),tinted:Ne2?.complete?hy(Ne2,pv(a2),0,Pe2):null,fallback:ke2,x:xe2,y:Se2+28,direction:f2.x})';
 replace(draw,'(colMountedR49?'+mounted+':'+draw+')',2,'native armor upper body and seated leg composition');
 replace('  let Ve2 = a2 === `arkanist` ? 14 : 0, He2 = P2 ? r2 - 18 : r2 - 132 - Ve2;','  if(colMountedR49)r2-=colMountedR49.labelLift;\n  let Ve2 = a2 === `arkanist` ? 14 : 0, He2 = P2 ? r2 - 18 : r2 - 132 - Ve2;');
 const suffix=`\nconst colMountUIR49=createMountUIR49(R,{Dialog:It,Content:kt,Header:Pt,Title:jt,Description:Ct,art:${JSON.stringify(art)}});\nconst colMountRendererR49=createMountRendererR49(${JSON.stringify(art)});\n`;
 source+=suffix;edits.push({position:'append',from:'',to:suffix,label:'mount UI and renderer binding'});
 if(reverseR40Edits(source,edits)!==input)throw Error('mount49_inverse');
 return{source,proof:{version:'mount-r49',sourceSha256:sha(input),patchedSha256:sha(source),helper,art,edits,scope:'Mount quest dialog, single Bin/İn shortcut, Seyis NPC, server-confirmed scalar movement factor, seated native player composition on both own and remote draw paths. No protocol, animation loop, poll timer, mobile menu flag, or legacy movement algorithm changed.'}};
}

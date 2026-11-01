import {createHash} from 'node:crypto';
import {parse} from '../perf-r11/tests/parser.mjs';
import {MOUNT_ITEMS} from './mounts-model.mjs';
import {createMountGrantAdminR49} from './admin-mount-client-r49.mjs';
const hash=source=>createHash('sha256').update(source).digest('hex');
export function patchAdminMountClientR49(source){
 let output=source;const edits=[];
 const replace=(from,to,count=1)=>{if(output.split(from).length-1!==count)throw Error('admin_r49_client_anchor_changed:'+from.slice(0,70));output=output.split(from).join(to);edits.push({from,to,count});};
 replace('var X = e(t(), 1), Z = n();','var X = e(t(), 1), Z = n();\nconst colMountGrantR49=('+createMountGrantAdminR49.toString()+')(X,'+JSON.stringify(MOUNT_ITEMS)+');');
 replace('fetch(e3.action === "grant_azrail_chests" ?','fetch(e3.action === "grant_mount_material_r49" ? "/api/admin?core511=mounts" : e3.action === "grant_azrail_chests" ?');
 replace('colSecurityBody508.action === "grant_azrail_chests"','(colSecurityBody508.action === "grant_azrail_chests" || colSecurityBody508.action === "grant_mount_material_r49")',2);
 const anchor='X.createElement(colSpecializationReset463Admin, { player: d2.players.find((e3) => e3.id === R2), busy: T2, act: q2 })';
 replace(anchor,'X.createElement(colMountGrantR49, { player: d2.players.find((e3) => e3.id === R2), busy: T2, act: q2 }), '+anchor);
 parse(output,{ecmaVersion:'latest',sourceType:'module'});
 return {source:output,proof:{sourceSha256:hash(source),patchedSha256:hash(output),edits,scope:'Selected-player bound mount materials and certificates from canonical catalog; feature-flag gated card; existing authenticated admin request lock; exact pending request preserved across lost replies and reloads.'}};
}

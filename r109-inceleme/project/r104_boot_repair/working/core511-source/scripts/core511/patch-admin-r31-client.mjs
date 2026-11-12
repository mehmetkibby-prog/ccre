import {createHash} from 'node:crypto';
import {parse} from '../perf-r11/tests/parser.mjs';
import {createAzrailGrantAdminR31} from './admin-r31-client.mjs';
const hash=source=>createHash('sha256').update(source).digest('hex');
export function patchAdminR31Client(source){
 let output=source;const edits=[];
 const replace=(from,to,count=1)=>{if(output.split(from).length-1!==count)throw Error('admin_r31_client_anchor_changed:'+from.slice(0,70));output=output.split(from).join(to);edits.push({from,to,count});};
 replace('var X = e(t(), 1), Z = n();','var X = e(t(), 1), Z = n();\nconst colAzrailGrantR31=('+createAzrailGrantAdminR31.toString()+')(X);');
 replace('fetch(e3.action.startsWith("sis_mist_") ?','fetch(e3.action === "grant_azrail_chests" ? "/api/admin?core511=azrail-grant" : e3.action.startsWith("sis_mist_") ?');
 replace('colSecurityBody508.action.startsWith("sis_mist_")','(colSecurityBody508.action.startsWith("sis_mist_") || colSecurityBody508.action === "grant_azrail_chests")',2);
 const anchor='X.createElement(colSpecializationReset463Admin, { player: d2.players.find((e3) => e3.id === R2), busy: T2, act: q2 })';
 replace(anchor,'X.createElement(colAzrailGrantR31, { player: d2.players.find((e3) => e3.id === R2), busy: T2, act: q2 }), '+anchor);
 parse(output,{ecmaVersion:'latest',sourceType:'module'});
 return {source:output,proof:{sourceSha256:hash(source),patchedSha256:hash(output),edits,scope:'Dedicated selected-player chest grant card; existing admin request lock and credentials; same pending request survives retry; original admin response path bypassed only by existing adminRefreshRequired508 reply flag.'}};
}

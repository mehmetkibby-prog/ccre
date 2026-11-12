import {createHash} from 'node:crypto';
import {ADMIN_SETTINGS_R65} from './admin-settings-r65.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex');
// Only the global broken-core settings action joins the authenticated R65
// barrier. Send/revoke still use their exact player-scoped coordinator.
export function patchAdminSavesR66(source){
 const edits=[];let output=source;
 const replace=(from,to)=>{if(output.split(from).length!==2)throw Error('admin_save_r66_anchor');output=output.replace(from,to);edits.push({from,to});};
 const prior=ADMIN_SETTINGS_R65.filter(action=>action!=='save_broken_core464');
 const oldGate=JSON.stringify(prior)+'.includes(payload.action)?database.core511Configuration.runAdminSettingsR65',newGate=JSON.stringify(ADMIN_SETTINGS_R65)+'.includes(payload.action)?database.core511Configuration.runAdminSettingsR65';
 if(output.includes(oldGate))replace(oldGate,newGate);
 else if(output.split(newGate).length!==2)throw Error('admin_save_r66_gate');
 replace("try{return await channelPermanent(payload.action==='save_broken_core464'?[]:[payload.playerId],()=>adminNativeCore464(globalThis.__colPremium?.db??database.sqlite,payload,adminId));}","try{if(payload.action==='save_broken_core464')return adminNativeCore464(globalThis.__colPremium?.db??database.sqlite,payload,adminId);return await channelPermanent([payload.playerId],()=>adminNativeCore464(globalThis.__colPremium?.db??database.sqlite,payload,adminId));}");
 return {source:output,proof:{sourceSha256:hash(source),patchedSha256:hash(output),edits,scope:'Broken-core global save uses authenticated all-owner settings barrier; native validation, transaction, receipt, send and revoke remain unchanged.'}};
}

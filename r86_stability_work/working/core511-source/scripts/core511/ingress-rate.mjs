import {createIngressRules} from './generated/ingress-rules.mjs';
import {demand} from './contract.mjs';
import {NATIVE_MODE_RATE} from './generated/mode-policy.mjs';
export class IngressRate {
 constructor({clock=Date.now}){this.rules=createIngressRules(clock);this.clock=clock;}
 check(identity,payload){
  demand(identity?.actor&&identity?.account&&typeof payload?.action==='string','rate_identity');
  if(payload.action==='dungeon')return this.rules.dungeon(identity.actor)?1:0;
  if(payload.action==='mode'){
   demand(typeof payload.kind==='string'&&Object.hasOwn(NATIVE_MODE_RATE,payload.kind),'mode_rate_policy');const policy=NATIVE_MODE_RATE[payload.kind];
   // Native rank/community HTTP routes use their persistent limiter only.
   // The guild route shares the existing local global/other window.
   return policy.localCategory?this.rules.action(identity.account,policy.localCategory):0;
  }
  return this.rules.action(identity.account,payload.action);
 }
 // Trusted transfer control only. Client frames can neither import nor clear
 // windows. Target merge is conservative when a delayed duplicate arrives.
 snapshot(identity){return {actor:identity.actor,account:identity.account,windows:[...this.rules.localWindows].filter(([k])=>k.startsWith(identity.account+':')).map(([k,v])=>[k,{...v}]),dungeon:this.rules.rates.has(identity.actor)?{...this.rules.rates.get(identity.actor)}:null};}
 restore(identity,snapshot){
  demand(snapshot?.actor===identity.actor&&snapshot.account===identity.account&&Array.isArray(snapshot.windows)&&snapshot.windows.length<=10,'rate_transfer_scope');
  const selected=new Map();for(const [key,row]of snapshot.windows){demand(key.startsWith(identity.account+':')&&['global','move','heartbeat','combat','loot','rewards','fishing','crafting485','economy','other'].includes(key.slice(identity.account.length+1))&&Number.isFinite(row.startedAtMs)&&Number.isSafeInteger(row.count)&&row.count>=0,'rate_transfer_window');selected.set(key,row);}
  const merged=(old,row,time)=>!old||row[time]>old[time]?{...row}:row[time]===old[time]?{...row,count:Math.max(row.count,old.count)}:old;
  for(const [k,row]of selected)this.rules.localWindows.set(k,merged(this.rules.localWindows.get(k),row,'startedAtMs'));
  if(snapshot.dungeon){const d=snapshot.dungeon;demand(Number.isFinite(d.at)&&Number.isSafeInteger(d.count)&&d.count>=0,'rate_transfer_window');this.rules.rates.set(identity.actor,merged(this.rules.rates.get(identity.actor),d,'at'));}
 }
}

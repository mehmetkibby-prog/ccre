import {createHash} from 'node:crypto';
import {sameAttackFrame} from './attack-writer.mjs';
const recent=new WeakMap();
// Only rejected actions reach here. No player values, session tokens, account
// names or settings contents enter the log. Bound both memory and repeat noise.
export function logActionConflictR65(sql,context,input,player,settings,expected){
 let seen=recent.get(sql);if(!seen){seen=new Map();recent.set(sql,seen);}
 const now=Date.now(),id=context.actor;
 if(now-(seen.get(id)??-Infinity)<10000)return;
 if(seen.size>=256)seen.delete(seen.keys().next().value);seen.set(id,now);
 const fields=(a,b)=>[...new Set([...Object.keys(a??{}),...Object.keys(b??{})])].filter(k=>k!=='last_seen'&&!sameAttackFrame(a?.[k],b?.[k])).slice(0,32);
 console.warn(JSON.stringify({event:'core511_action_conflict',code:'action_frame_conflict',action:input.action,channel:context.peer?.channel??null,actorRef:createHash('sha256').update(String(id)).digest('hex').slice(0,16),playerFields:fields(player,expected?.player),settingsFields:fields(settings,expected?.settings)}));
}

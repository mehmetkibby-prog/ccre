import {boundedCombatOutput} from './r50-reward-output-options.mjs';
import {combatSizeAccountingR51} from './r51-options.mjs';
import {combatArraySizeR51} from './combat-size-accounting-r51.mjs';

export const COMBAT_EVENT_BYTES=16*1024;
const bytes=value=>Buffer.byteLength(JSON.stringify(value)??'null');
const outputLimits=new WeakSet();
const requireOutput=(valid,code)=>{if(!valid){const error=Object.assign(new Error(code),{code});outputLimits.add(error);throw error;}};
export const isCombatOutputLimit=error=>outputLimits.has(error);

// Both existing client progression consumers construct Map([id,row]): only
// the final row per actor is applied. Native XP/level writes and every hit stay
// untouched; the first-occurrence order and final complete row are retained.
export function compactCombatResult(result){
 const rows=result?.body?.progression;
 if(!boundedCombatOutput||!Array.isArray(rows)||rows.length<2)return result;
 const latest=new Map(rows.map(row=>[row.id,row]));
 return latest.size===rows.length?result:{...result,body:{...result.body,progression:[...latest.values()]}};
}

// Native room senders accept at most 24,000 bytes. Bound these array events
// below that existing limit without raising it or omitting any target row.
// This function runs before the writer's notification/receipt transaction ends.
export function splitCombatEvent(event){
 if(!boundedCombatOutput||!event||!['monster_preview','monster_result'].includes(event.type))return [event];
 const keys=(event.type==='monster_preview'?['previews']:['hits','states']).filter(key=>Array.isArray(event[key]));
 if(!keys.length)return [event];
 const measured=combatSizeAccountingR51?combatArraySizeR51(event,keys):null;
 if((measured?.bytes??bytes(event))<=COMBAT_EVENT_BYTES)return [event];
 requireOutput(typeof event.eventId==='string'&&event.eventId.length>0,'combat_event_id_required');
 const parts=[],length=Math.max(...keys.map(key=>event[key].length));
 const make=()=>({...event,eventId:event.eventId+':part:'+parts.length,...Object.fromEntries(keys.map(key=>[key,[]]))});
 let part=make(),size=bytes(part)+16,count=0;
 for(let i=0;i<length;i++){
  const entries=keys.filter(key=>i<event[key].length).map(key=>[key,event[key][i],measured?.sizes.get(key)[i]??bytes(event[key][i])]);
  let extra=entries.reduce((sum,[key,,n])=>sum+n+(part[key].length?1:0),0);
  if(count&&size+extra>COMBAT_EVENT_BYTES){parts.push(part);part=make();size=bytes(part)+16;count=0;extra=entries.reduce((sum,[,,n])=>sum+n,0);}
  requireOutput(size+extra<=COMBAT_EVENT_BYTES,'combat_event_row_too_large');
  for(const [key,row]of entries)part[key].push(row);
  size+=extra;count++;
 }
 if(count)parts.push(part);
 requireOutput(parts.length>0,'combat_event_metadata_too_large');return parts;
}

export function splitCombatNotifications(events){
 if(!boundedCombatOutput)return events;
 let output=null;
 for(let i=0;i<events.length;i++){
  const args=events[i],index=Array.isArray(args)?args.findIndex(v=>v&&typeof v==='object'&&!Array.isArray(v)&&['monster_preview','monster_result'].includes(v.type)):-1;
  const parts=index<0?null:splitCombatEvent(args[index]);
  if(parts&&parts.length>1){output??=events.slice(0,i);for(const part of parts){const copy=[...args];copy[index]=part;output.push(copy);}}
  else if(output)output.push(args);
 }
 return output??events;
}

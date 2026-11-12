import {WORLD_PUSH_MAX_PARTS,WORLD_PUSH_MAX_FRAME_BYTES} from '../../lib/world-push-frame.mjs';
export const WORLD_PACKET_BUDGET=23500;
export const worldPacketBody=(sub,event)=>JSON.stringify({v:1,cycle:sub.data.world.cycle,audiencePlayerIds:[sub.id],event});
export function worldPayloadSizes(event){
 const sizes={};for(const group of ['fields','entities'])for(const [key,value]of Object.entries(event[group]??{}))sizes[group+'.'+key]=Buffer.byteLength(JSON.stringify(value));
 return Object.fromEntries(Object.entries(sizes).sort((a,b)=>b[1]-a[1]).slice(0,24));
}
export function splitWorldEvent(sub,event,{budget=WORLD_PACKET_BUDGET}={}){
 if(Buffer.byteLength(worldPacketBody(sub,event))<=budget)return [event];
 const {entities,fields,...scope}=event;
 const shell={...scope,seq:Number.MAX_SAFE_INTEGER,frame:{id:String(event.seq),index:127,total:128},entities:{},fields:{}};
 const overhead=Buffer.byteLength(worldPacketBody(sub,shell))+128;
 const limit=budget-overhead;if(limit<512)throw Error('World envelope too large');
 const units=[];
 for(const [key,value]of Object.entries(fields??{})){
  const unit={fields:{[key]:value}},size=Buffer.byteLength(JSON.stringify(unit));
  if(size<=limit)units.push(unit);
  else {
   // Only ordinary top-level fields are segmented. Player/monster/loot rows
   // remain visible to the realtime server's existing privacy checks.
   const encoded=Buffer.from(JSON.stringify(value)),stride=Math.floor((limit-128)/2);
   for(let start=0;start<encoded.length;){
    let end=Math.min(encoded.length,start+stride);
    while(end<encoded.length&&(encoded[end]&0xc0)===0x80)end--;
    units.push({fieldSegments:[{key,text:encoded.toString('utf8',start,end)}]});start=end;
   }
  }
 }
 for(const [key,change]of Object.entries(entities??{}))for(const kind of ['upsert','remove','order']){
  if(kind==='order'&&change.order?.length===0)units.push({entities:{[key]:{order:[]}}});
  for(const value of change[kind]??[])units.push({entities:{[key]:{[kind]:[value]}}});
 }
 const parts=[];let part={entities:{},fields:{}},size=0,totalBytes=0;
 const finish=()=>{parts.push(part);part={entities:{},fields:{}};size=0;};
 for(const unit of units){
  const n=Buffer.byteLength(JSON.stringify(unit))+2;
  if(n>limit)throw Error('World entity row too large');
  totalBytes+=n;if(totalBytes>WORLD_PUSH_MAX_FRAME_BYTES)throw Error('World frame too large');
  if(size&&size+n>limit)finish();size+=n;
  Object.assign(part.fields,unit.fields);
  for(const [key,change]of Object.entries(unit.entities??{}))for(const [kind,values]of Object.entries(change)){
   const out=part.entities[key]??={};(out[kind]??=[]).push(...values);
  }
  if(unit.fieldSegments)(part.fieldSegments??=[]).push(...unit.fieldSegments);
 }
 if(size)finish();
 if(parts.length>WORLD_PUSH_MAX_PARTS)throw Error('Too many world frame parts');
 return parts.map((part,index)=>({...scope,...part,frame:{id:String(event.seq),index,total:parts.length}}));
}

// Atomic multi-packet frames. Every packet retains inspectable entity rows and
// the complete signed recipient/scope envelope; no opaque entity payloads.
export const WORLD_PUSH_MAX_PARTS=128;
export const WORLD_PUSH_MAX_FRAME_BYTES=2*1024*1024;
export function joinWorldParts(parts){
 const last=parts.at(-1),entities={},fields={},segments=new Map();
 for(const part of parts){
  Object.assign(fields,part.fields);
  for(const [key,change]of Object.entries(part.entities??{})){
   const out=entities[key]??={upsert:[],remove:[]};
   out.upsert.push(...(change.upsert??[]));out.remove.push(...(change.remove??[]));
   if(change.order)(out.order??=[]).push(...change.order);
  }
  for(const piece of part.fieldSegments??[]){
   if(!/^[a-zA-Z][a-zA-Z0-9]*$/.test(piece.key)||['constructor','prototype','__proto__'].includes(piece.key))throw Error('Invalid field segment');
   const entries=segments.get(piece.key)??[];entries.push(piece.text);segments.set(piece.key,entries);
  }
 }
 for(const [key,entries]of segments)fields[key]=JSON.parse(entries.join(''));
 return {...last,frame:undefined,fieldSegments:undefined,entities,fields};
}
export function createWorldFrameAssembler(){
 let pending=null;
 return {
  clear(){pending=null;},
  accept(message){
   const f=message.frame;
   if(!f){if(pending)throw Error('Interrupted world frame');return message;}
   if(!Number.isInteger(f.index)||!Number.isInteger(f.total)||f.total<2||f.total>WORLD_PUSH_MAX_PARTS||f.index<0||f.index>=f.total||typeof f.id!=='string')throw Error('Invalid world frame');
   if(f.index===0){if(pending)throw Error('Overlapping world frame');pending={id:f.id,total:f.total,parts:[],bytes:0};}
   if(!pending||pending.id!==f.id||pending.total!==f.total||pending.parts.length!==f.index)throw Error('Missing world frame part');
   pending.bytes+=JSON.stringify(message).length*3; // conservative UTF-8 upper bound
   if(pending.bytes>WORLD_PUSH_MAX_FRAME_BYTES*3)throw Error('World frame too large');
   pending.parts.push(message);
   if(f.index!==f.total-1)return null;
   const parts=pending.parts;pending=null;return joinWorldParts(parts);
  },
 };
}

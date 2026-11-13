// Immutable publication images are serialized once on the authoritative writer.
// Parent IPC/receipt caches retain text rather than duplicate native object graphs.
// Only the owning channel decodes the image, immediately before revision validation.
export function encodeCommittedActorR113(part){
 const o=part.bundle.owner;
 return {id:part.id,base:part.base,next:part.next,epoch:o.epoch,channel:o.channel,incarnation:o.incarnation,image:JSON.stringify(part)};
}
export function decodeCommittedActorR113(part){
 if(!part||!Object.hasOwn(part,'image'))return part;
 if(typeof part.image!=='string'||part.image.length>1024*1024)return null;
 try{
  const value=JSON.parse(part.image),o=value?.bundle?.owner;
  if(!o||value.id!==part.id||value.base!==part.base||value.next!==part.next||o.epoch!==part.epoch||o.channel!==part.channel||o.incarnation!==part.incarnation)return null;
  return value;
 }catch{return null;}
}

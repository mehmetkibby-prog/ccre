import {deflateRawSync,inflateRawSync} from 'node:zlib';
import {createHash} from 'node:crypto';
const MAX_IMAGE=1024*1024;
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
// Immutable publication images are serialized once on the authoritative writer.
// Parent IPC/receipt caches retain text rather than duplicate native object graphs.
// Only the owning channel decodes the image, immediately before revision validation.
export function encodeCommittedActorR113(part,{compress=process.env.CORE511_R113_IMAGE_COMPRESSION!=='0'}={}){
 const o=part.bundle.owner;let image=JSON.stringify(part);
 const size=Buffer.byteLength(image);
 // Large committed images are carried opaquely through the parent. Compression
 // happens once, in the authoritative writer; only their owning channel opens
 // them. Do not trade extra CPU for tiny/already-incompressible responses.
 if(compress&&size>=8192&&size<=MAX_IMAGE){
  const bytes=Buffer.from(image),packed=deflateRawSync(bytes,{level:1});
  const encoded='z1:'+size+':'+digest(bytes)+':'+packed.toString('base64');
  if(encoded.length<image.length*0.85)image=encoded;
 }
 return {id:part.id,base:part.base,next:part.next,epoch:o.epoch,channel:o.channel,incarnation:o.incarnation,image};
}
export function decodeCommittedImageR113(image){
 if(typeof image!=='string'||Buffer.byteLength(image)>MAX_IMAGE)return null;
 try{
  if(image.startsWith('z1:')){
   const m=/^z1:([1-9][0-9]{0,6}):([a-f0-9]{64}):([A-Za-z0-9+/]+={0,2})$/.exec(image);
   if(!m||+m[1]>MAX_IMAGE)return null;
   const packed=Buffer.from(m[3],'base64');if(packed.toString('base64')!==m[3])return null;
   const bytes=inflateRawSync(packed,{maxOutputLength:+m[1]});
   if(bytes.length!==+m[1]||digest(bytes)!==m[2])return null;
   image=bytes.toString('utf8');
  }
  return JSON.parse(image);
 }catch{return null;}
}
export function decodeCommittedActorR113(part){
 if(!part||!Object.hasOwn(part,'image'))return part;
 try{
  const value=decodeCommittedImageR113(part.image),o=value?.bundle?.owner;
  if(!o||value.id!==part.id||value.base!==part.base||value.next!==part.next||o.epoch!==part.epoch||o.channel!==part.channel||o.incarnation!==part.incarnation)return null;
  return value;
 }catch{return null;}
}

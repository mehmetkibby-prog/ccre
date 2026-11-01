import {createHash} from 'node:crypto';
const before="net.connect({host:'127.0.0.1',port:d.channelPorts[channel-1]})";
const after="net.connect({host:'127.0.0.1',port:d.channelPorts[channel-1],noDelay:true})";
export async function load(url,context,next){
 const result=await next(url,context);
 if(!url.endsWith('/delivery511/runtime-ingress.mjs'))return result;
 const source=String(result.source??'');
 if(createHash('sha256').update(source).digest('hex')!=='4b4a74bb7e57736787d717d51f28bb901e5d7f7fde060151bb84ad5c5c8b5403'||source.split(before).length!==2)throw Error('ingress_nodelay_ab_source_drift');
 return {...result,source:source.replace(before,after)};
}

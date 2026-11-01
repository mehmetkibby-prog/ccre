import http from 'node:http';
import {chmod,unlink} from 'node:fs/promises';
import {timingSafeEqual,randomUUID} from 'node:crypto';
import {channelError,jsonBytes,requestDigest} from './channel-protocol.mjs';

// Direct worker-to-worker traffic over a private Unix socket or authenticated loopback.
// No gateway/main relay. A Unix socket needs a parent-provisioned 0700 directory.
export async function createChannelPeerServer({socketPath,port=0,secret,handlers,maxResponses=256}){
 if(typeof secret!=='string'||secret.length<32)throw Error('Peer secret required');
 const token=Buffer.from(secret),responses=new Map();
 const server=http.createServer(async(req,res)=>{
  const send=(status,body)=>{res.writeHead(status,{'content-type':'application/json'});res.end(jsonBytes(body));};
  const received=Buffer.from(String(req.headers['x-col-peer']??''));
  if(req.method!=='POST'||req.url!=='/command'||received.length!==token.length||!timingSafeEqual(received,token)){send(403,{code:'peer_denied'});return;}
  try{
   let bytes=0;const parts=[];for await(const p of req){bytes+=p.length;if(bytes>1024*1024)throw channelError('peer_payload_limit');parts.push(p);}
   const request=JSON.parse(Buffer.concat(parts));
   if(typeof request.id!=='string'||request.id.length>160||!Object.hasOwn(handlers,request.method))throw channelError('peer_invalid_command');
   const digest=requestDigest(request),previous=responses.get(request.id);
   if(previous&&previous.digest!==digest)throw channelError('peer_id_reused');
   let entry=previous;
   if(!entry){
    while(responses.size>=maxResponses){const idle=[...responses].find(([,v])=>v.done);if(!idle)throw channelError('peer_backpressure');responses.delete(idle[0]);}
    entry={digest,done:false};responses.set(request.id,entry);
    entry.result=Promise.resolve().then(()=>handlers[request.method](request.payload)).then(result=>({ok:true,result}),error=>({ok:false,code:error.code??'peer_handler_failed'})).finally(()=>{entry.done=true;});
   }
   send(200,await entry.result);
  }catch(error){if(!res.headersSent)send(400,{ok:false,code:error.code??'peer_invalid_request'});else res.destroy();}
 });
 await new Promise((resolve,reject)=>{server.once('error',reject);if(socketPath)server.listen(socketPath,resolve);else server.listen(port,'127.0.0.1',resolve);});if(socketPath)await chmod(socketPath,0o600);
 return {server,port:socketPath?null:server.address().port,async close(){server.closeAllConnections();await new Promise(r=>server.close(r));if(socketPath)await unlink(socketPath).catch(e=>{if(e.code!=='ENOENT')throw e;});}};
}
export class ChannelPeerClient {
 constructor({socketPath,port,secret,timeoutMs=5000}){this.socketPath=socketPath;this.port=port;this.secret=secret;this.timeoutMs=timeoutMs;this.agent=new http.Agent({keepAlive:true,maxSockets:8});}
 request(method,payload,{id=randomUUID()}={}){
  const body=jsonBytes({id,method,payload});
  return new Promise((resolve,reject)=>{
   const req=http.request({...(this.socketPath?{socketPath:this.socketPath}:{host:'127.0.0.1',port:this.port}),path:'/command',method:'POST',agent:this.agent,headers:{'x-col-peer':this.secret,'content-type':'application/json','content-length':Buffer.byteLength(body)}},res=>{
    let size=0;const chunks=[];res.on('data',part=>{size+=part.length;if(size>1024*1024)req.destroy(channelError('peer_outcome_unknown'));else chunks.push(part);});
    res.on('end',()=>{try{const reply=JSON.parse(Buffer.concat(chunks));if(res.statusCode===200&&reply.ok===true)resolve(reply.result);else reject(channelError(reply.code??'peer_denied'));}catch{reject(channelError('peer_outcome_unknown'));}});
    res.on('error',()=>reject(channelError('peer_outcome_unknown')));
   });
   req.setTimeout(this.timeoutMs,()=>req.destroy(channelError('peer_outcome_unknown')));
   req.on('error',()=>reject(channelError('peer_outcome_unknown')));req.end(body);
  });
 }
 close(){this.agent.destroy();}
}

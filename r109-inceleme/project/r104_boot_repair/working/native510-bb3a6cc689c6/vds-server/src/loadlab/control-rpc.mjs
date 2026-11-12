import http from 'node:http';
import {bodyJson,reply,equalSecret,fail} from './protocol.mjs';
export async function createLocalControl({port,key,handlers}){
 let closing=false;const accepted=new Set();
 const server=http.createServer(async(req,res)=>{
  let resolveDone;const done=new Promise(resolve=>resolveDone=resolve);accepted.add(done);
  try{
   if(closing)throw fail('control_closing',503);
   if(!['127.0.0.1','::ffff:127.0.0.1'].includes(req.socket.remoteAddress)||req.method!=='POST'||req.url!=='/loadlab-v1'||!equalSecret(req.headers['x-col-loadlab-control'],key))throw fail('unauthorized',403);
   const input=await bodyJson(req);if(!input||typeof input.operation!=='string'||!Object.hasOwn(handlers,input.operation))throw fail('unknown_operation',404);
   const data=await handlers[input.operation](input.payload??{});reply(res,200,{ok:true,data});
  }catch(e){if(!res.headersSent&&!res.destroyed)reply(res,e.status??500,{ok:false,code:e.code??e.message??'control_failed'});else res.destroy();}
  finally{accepted.delete(done);resolveDone();}
 });
 server.requestTimeout=10000;server.headersTimeout=5000;server.keepAliveTimeout=5000;server.maxConnections=12;
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',resolve);});
 return {server,async close(){closing=true;const networkClosed=new Promise(resolve=>server.close(resolve));server.closeAllConnections();await networkClosed;await Promise.allSettled([...accepted]);}};
}
export async function localCall({port,key,operation,payload={},signal,timeoutMs=15000}){
 const abort=AbortSignal.timeout(timeoutMs);const combined=signal?AbortSignal.any([abort,signal]):abort;
 const response=await fetch('http://127.0.0.1:'+port+'/loadlab-v1',{method:'POST',headers:{'content-type':'application/json','x-col-loadlab-control':key},body:JSON.stringify({operation,payload}),signal:combined,redirect:'error'});
 const data=await response.json();if(!response.ok||!data.ok)throw fail(data.code??'control_failed',response.status);return data.data;
}

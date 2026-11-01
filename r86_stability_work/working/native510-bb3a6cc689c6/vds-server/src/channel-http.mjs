import {measureSync504} from './runtime-performance.mjs';
import {measureRequest477,perfStage477,recordHttpTiming477,attachHttpPerf477} from './request-performance477.mjs';
import {createServer} from 'node:http';
import {Readable} from 'node:stream';
import {pipeline} from 'node:stream/promises';
import {runEntryAdmission477,entryAdmissionResponse477} from './entry-admission477.mjs';

// Direct channel ingress. The realm writer does not receive these requests.
// Canonical handlers retain their session, presence, CSRF and gameplay checks.
export async function createChannelHttp({api,database,hosts,port=0,onError=()=>{}}){
 const allowed=new Set(hosts);if(!allowed.size)throw Error('Channel ingress hosts required');
 const routes=new Map([['POST /api/action',api.action],['GET /api/world',api.world],['POST /api/realtime/ticket',api.ticket]]);
 if(api.dungeonGet)routes.set('GET /api/dungeon',api.dungeonGet);
 if(api.dungeonPost)routes.set('POST /api/dungeon',api.dungeonPost);
 const server=createServer(async(req,res)=>{
  const ingressStarted477=performance.now();let pendingAbort=null,disconnected=null;
  try{
   const host=String(req.headers['x-forwarded-host']??req.headers.host??'');
   if(!allowed.has(host)){res.writeHead(421);res.end();return;}
   const protocol=req.headers['x-forwarded-proto']==='https'?'https':'http';
   const url=new URL(req.url,`${protocol}://${host}`);
   const handler=routes.get(`${req.method} ${url.pathname}`);
   const job504=url.pathname==='/api/world'?'channel_world':url.pathname==='/api/action'?'channel_action':url.pathname==='/api/realtime/ticket'?'channel_ticket':'channel_dungeon';
   if(!handler){res.writeHead(404);res.end();return;}
   const headers=new Headers();for(const [key,value]of Object.entries(req.headers))if(value!==undefined)headers.set(key,Array.isArray(value)?value.join(', '):value);
   let size=0;const chunks=[];
   for await(const chunk of req){size+=chunk.length;if(size>4096){res.writeHead(413);res.end();return;}chunks.push(chunk);}
   const body=Buffer.concat(chunks);
   // This is only a routing hint. Invalid JSON remains the canonical handler's
   // error; body, action, authentication and capacity rules are not replaced.
   let queuedJoin=false,actionName='';
   if(req.method==='POST'&&url.pathname==='/api/action')try{actionName=JSON.parse(body.toString('utf8'))?.action;queuedJoin=actionName==='join';}catch{}
   if(queuedJoin){
    pendingAbort=new AbortController();
    disconnected=()=>{if(!res.writableFinished)pendingAbort.abort();};
    req.once('aborted',disconnected);res.once('close',disconnected);
    if(req.aborted||res.destroyed)pendingAbort.abort();
   }
   const request=new Request(url,{method:req.method,headers,...(pendingAbort?{signal:pendingAbort.signal}:{}),...(req.method==='POST'?{body}:{})});
   let response;
   try{
    // Admission happens only after the unchanged authorization checks, so a
    // forged route/channel header cannot obtain a player lease.
    const sessionStarted477=performance.now();const session=await measureSync504('channel_session',()=>api.requireGameSession(request));const sessionElapsed477=performance.now()-sessionStarted477;
    if(!session.player)response=Response.json({code:'character_required'},{status:409});
    else if(queuedJoin){
     await api.assertCsrf(request,session);
     response=await runEntryAdmission477('channelJoin',session.account.id,request.signal,async()=>{
      // No player owner, shared grant or writer slot is held while queued.
      // Revalidate before owner admission, then the canonical handler performs
      // its normal checks again after an asynchronous owner claim.
      const current=await measureSync504('channel_session',()=>api.requireGameSession(request));
      await api.assertCsrf(request,current);
      if(current.account.id!==session.account.id||current.player?.id!==session.player.id) return Response.json({code:'realtime_scope_changed',error:'Kanal bağlantısını yenile.'},{status:409});
      return database.runPlayer(current.player.id,()=>measureSync504(job504,()=>handler(request)));
     });
    }else {
     const kind=url.pathname==='/api/world'?'world':url.pathname==='/api/action'?(actionName==='move'?'move':actionName==='attack'||actionName==='pvp_attack'?'attack':''):'';
     const record=await measureRequest477(kind,session.player.id,async()=>{
      perfStage477('native_ingress_session',sessionElapsed477);const admittedAt=performance.now();
      const result=await database.runPlayer(session.player.id,()=>{perfStage477('native_owner_wall',performance.now()-admittedAt);return measureSync504(job504,()=>handler(request));});
      recordHttpTiming477(result.headers.get('Server-Timing'));return result;
     },ingressStarted477,kind==='world'?(url.searchParams.get('combat')==='1'?'combat':url.searchParams.get('compact')==='1'?'compact':url.searchParams.get('owner')==='1'?'owner':'full'):undefined);response=record.result;attachHttpPerf477(response,record);
    }
   }catch(error){
    const queued=entryAdmissionResponse477(error);
    if(queued)response=queued;
    else if(['channel_scope','owner_draining','owner_not_admitted'].includes(error.message))response=Response.json({code:'realtime_scope_changed',error:'Kanal bağlantısını yenile.'},{status:409});
    else response=api.authErrorResponse(error,'İşlem tamamlanamadı.');
   }
   if(res.destroyed||pendingAbort?.signal.aborted)return;
   res.statusCode=response.status;
   for(const [key,value]of response.headers)if(key!=='set-cookie')res.setHeader(key,value);
   const cookies=response.headers.getSetCookie();if(cookies.length)res.setHeader('set-cookie',cookies);
   if(response.body)await pipeline(Readable.fromWeb(response.body),res);else res.end();
  }catch(error){if(!pendingAbort?.signal.aborted){onError(error);if(!res.headersSent)res.writeHead(503,{'content-type':'application/json'});res.end(JSON.stringify({code:'channel_unavailable'}));}}
  finally{if(disconnected){req.off('aborted',disconnected);res.off('close',disconnected);}}
 });
 server.keepAliveTimeout=65000;
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',()=>{server.off('error',reject);resolve();});});
 return {server,port:server.address().port,close:()=>new Promise(resolve=>{server.close(resolve);server.closeIdleConnections();})};
}

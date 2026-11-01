// Diagnostic/release gate: native HTTP + real TCP WS, 96 active background
// actors and one mover. A free destination slot preserves the hard cap of25.
// This does not substitute for the separate100-player180s performance pair.
import fs from 'node:fs';
import {randomUUID,randomBytes} from 'node:crypto';
import {nativeHttpServerFixture} from '../tests/native-http-server-fixture.mjs';
import {put} from '../tests/pvp-fixture.mjs';
import {nativeTokenHash} from '../entry-writer.mjs';
import {Core511Transport} from '../client-transport.mjs';
import {sourceIdentity} from '../source-identity.mjs';
import {PROTOCOL,demand} from '../contract.mjs';
import {until} from '../tests/helpers.mjs';
const {WebSocket}=await import('/tmp/core511-build-deps/node_modules/ws/wrapper.mjs');
const out=process.env.CORE511_TRANSFER_OUT;
demand(out?.startsWith('/')&&!fs.existsSync(out),'new_transfer_evidence_required');
const identity=sourceIdentity(),runId=randomUUID(),cleanup=[],scope={after:fn=>cleanup.push(fn)},players=[],clients=[],transfers=[],errors=[],fences=[],routeErrors=[],processEvents=[];
let s,timer,transport,closing=false,started,report,turn=0;
const counters={sent:0,acknowledged:0,unexpectedDisconnects:0,moverUnexpectedDisconnects:0,moverConnections:0,expectedTransferCloses:0,frames:0};
const headers=p=>({Origin:s.f.origin,Cookie:'__Host-yasam-session='+p.token+'; __Host-yasam-csrf='+p.csrf,'X-CSRF-Token':p.csrf,'X-Game-Instance':p.instance,'Content-Type':'application/json'});
const call=(p,name,body={})=>s.call('/api/realtime/core511-'+name,{method:'POST',headers:headers(p),body:{protocol:PROTOCOL,...body}});
const errorRow=e=>({code:e?.code,message:e?.message,stack:e?.stack});
function context(){return {at:Date.now(),processes:[...s.core.processes.values()].map(r=>({peer:r.peer,online:r.online})),durableProcesses:s.f.sql.prepare('SELECT * FROM kernel511_channel_processes').all(),supervisor:s.supervisor.snapshot(),mover:players.length?s.writer.authority.owner(players.at(-1).id):null,transitions:[...s.core.transitions].map(([id,r])=>({id,phase:r.phase,owner:r.owner})),global:s.core.globalWorld?.held?.phase??null};}
function watch(row){row.child.on('message',m=>{if(['test-native-failure','kernel511-failed'].includes(m?.type))processEvents.push({at:Date.now(),channel:row.peer.channel,incarnation:row.peer.incarnation,...m});});row.child.on('exit',(code,signal)=>{if(!closing)processEvents.push({at:Date.now(),channel:row.peer.channel,incarnation:row.peer.incarnation,code,signal,stderr:row.stderr});});}
try{
 s=await nativeHttpServerFixture(scope,{worldJobs:true,realmSetup:async(host,seed)=>{
  await host.database.atomic(sql=>{
   const template=sql.prepare('SELECT * FROM players WHERE id=?').get(seed.id),now=Date.now();sql.exec('UPDATE players SET last_seen=0; DELETE FROM game_presence');
   for(let n=0;n<97;n++){
    const channel=[2,3,4,1][n%4],index=Math.floor(n/4),id=runId+':'+n,accountId=id+':account',token=randomBytes(32).toString('hex'),csrf=randomBytes(32).toString('hex'),instance=randomUUID(),x=2700+(index%5)*28,y=2025+Math.floor(index/5)*28,targetId='golge-transfer-'+runId+'-'+n;
    put(sql,'accounts',{...seed.account,id:accountId,username:'transfer'+n,username_normalized:'transfer'+n,email:'transfer'+n+'@fixture.invalid',email_normalized:'transfer'+n+'@fixture.invalid'});
    put(sql,'players',{...template,id,account_id:accountId,name:'Transfer'+n,channel,area:n===96?'bazaar':'forest',x:n===96?900:x,y:n===96?900:y,hp:100000,max_hp:1000000,potions:2,gems:1000,essence:1000,attack_one_at:0,attack_two_at:0,attack_three_at:0,attack_four_at:0,last_seen:0,loadlab_run_id:''});
    put(sql,'auth_sessions',{token_hash:nativeTokenHash(token),csrf_hash:nativeTokenHash(csrf),account_id:accountId,created_at:Math.floor(now/1000),last_seen_at:Math.floor(now/1000),expires_at:Math.floor(now/1000)+3600,security_version:seed.account.security_version});
    put(sql,'game_presence',{account_id:accountId,token_hash:nativeTokenHash(token),instance_id:instance,expires_at_ms:now+40000,chat_after_id:0});
    if(n<96)put(sql,'monsters',{id:targetId,name:'Gölge',area:'forest',channel,x:x+20,y,hp:100000000,max_hp:100000000,spawn_round:17,last_damaged_at_ms:now,last_regen_at_ms:now});
    players.push({id,accountId,token,csrf,instance,channel,x,y,targetId});
   }
  });
 }});
 for(const row of s.supervisor.rows.values()){row.child.setMaxListeners(128);watch(row);}
 const boot=s.supervisor.boot.bind(s.supervisor);s.supervisor.boot=async(...a)=>{const row=await boot(...a);watch(row);return row;};
 for(const [object,method] of [[s.core,'process'],[s.writer.authority,'assertProcess']]){const original=object[method].bind(object);object[method]=(...args)=>{try{return original(...args);}catch(e){if(e.code==='channel_process_fenced'&&fences.length<20)fences.push({method,args:args.slice(0,method==='process'?1:2),error:errorRow(e),context:context()});throw e;}};}
 const route=s.core.route.bind(s.core);s.core.route=async(peer,method,payload)=>{try{return await route(peer,method,payload);}catch(e){if(routeErrors.length<20)routeErrors.push({at:Date.now(),peer,method,scope:Array.isArray(payload)?payload.map(p=>({actor:p.actor,epoch:p.epoch})):payload&&{actor:payload.actor,playerId:payload.playerId,epoch:payload.epoch,operation:payload.operation,sequence:payload.sequence},error:errorRow(e),context:context()});throw e;}};
 await s.host.database.atomic(()=>{for(const p of players)globalThis.__colLaunch.grant(p.accountId,true);});s.core.start();
 for(const p of players.slice(0,96)){
  const r=await call(p,'ticket');demand(r.status===200&&r.body.channel===p.channel,'transfer_background_admission');const live=await s.networkConnect(r.body,{localAddress:'127.0.0.'+(clients.length+2)}),c={p,...live,sequence:0,pending:new Set()};clients.push(c);
  c.ws.on('close',(code,reason)=>{if(!closing){counters.unexpectedDisconnects++;errors.push({kind:'background_close',id:p.id,code,reason:String(reason)});}});
  c.ws.on('message',b=>{try{const v=JSON.parse(b);if(v.type==='frame'){counters.frames++;for(const result of v.results??[]){demand(c.pending.delete(result.sequence),'transfer_result_sequence');counters.acknowledged++;if(result.status!==undefined&&(result.status<200||result.status>=300)||result.error||result.body?.error||result.body?.ok===false)errors.push({kind:'background_result',id:p.id,result});}}if(v.type==='event')c.ws.send(JSON.stringify({type:'event_ack',ids:[v.id]}));}catch(e){errors.push({kind:'background_packet',...errorRow(e)});}});
 }
 const p=players.at(-1);
 class DirectSocket extends WebSocket{constructor(url){const u=new URL(url),channel=Number(u.pathname.split('/').at(-1));super('ws://127.0.0.1:'+s.listeners[channel].port+u.pathname,{origin:s.f.origin,localAddress:'127.0.0.200'});const epoch=s.writer.authority.owner(p.id).epoch;counters.moverConnections++;this.on('close',(code,reason)=>{if(closing)return;const current=s.writer.authority.owner(p.id),expected=current?.epoch>epoch&&current.channel!==channel&&((code===4003&&String(reason)==='Session revoked')||(code===1000&&String(reason)==='Connection replaced'));if(expected)counters.expectedTransferCloses++;else{counters.moverUnexpectedDisconnects++;errors.push({kind:'mover_close',channel,epoch,code,reason:String(reason),current});}});}}
 const fetch=async(url,options={})=>{const u=new URL(url,s.f.origin),r=await s.call(u.pathname+u.search,{method:options.method??'GET',body:options.body,headers:options.headers});return new Response(r.bytes,{status:r.status,headers:r.headers});};
 transport=new Core511Transport({fetch,WebSocket:DirectSocket,origin:s.f.origin,headers:()=>headers(p),notify:(kind,value)=>{if(kind==='error')errors.push({kind:'mover',value});}});await transport.image();
 const potion=await transport.command({action:'use_potion'});demand(potion.status===200&&s.f.sql.prepare('SELECT potions FROM players WHERE id=?').get(p.id).potions===1,'transfer_potion_durable_debit');
 timer=setInterval(()=>{turn++;for(const c of clients)if(!c.pending.size&&c.ws.readyState===1){const sequence=++c.sequence,payload=turn%20===0?{action:'heartbeat'}:turn%2?{action:'move',area:'forest',x:c.p.x+(turn%4===1?2:0),y:c.p.y}:{action:'attack',targetId:c.p.targetId,spawnRound:17,ability:0,intentId:randomUUID()};c.pending.add(sequence);counters.sent++;c.ws.send(JSON.stringify({type:'input',sequence,payload}));}},500);
 started=performance.now();
 for(let n=0;n<200;n++){
  const before=s.writer.authority.owner(p.id),channel=before.channel%4+1,at=performance.now(),response=await transport.request('/api/action',{method:'POST',body:JSON.stringify({action:'select_channel',channel})},fetch),body=await response.json(),after=s.writer.authority.owner(p.id),counts=[...s.writer.authority.counts()],row={n:n+1,from:before.channel,to:channel,status:response.status,ms:performance.now()-at,beforeEpoch:before.epoch,afterEpoch:after?.epoch,ownerChannel:after?.channel,viewChannel:transport.world?.channel,counts};transfers.push(row);
  if(response.status!==200){row.body=body;row.context=context();throw Object.assign(Error('transfer_http_'+response.status+'_'+body.code),{code:body.code});}
  demand(after.channel===channel&&after.epoch===before.epoch+1&&transport.world.channel===channel&&counts.every(([,count])=>count<=25),'transfer_owner_or_capacity_mismatch');
  demand(s.f.sql.prepare('SELECT potions FROM players WHERE id=?').get(p.id).potions===1&&transport.world.players.find(v=>v.id===p.id)?.potions===1,'transfer_current_db_snapshot');
  demand(!errors.length&&!s.faults.length,'transfer_load_fault');
 }
 clearInterval(timer);timer=null;await until(()=>clients.every(c=>!c.pending.size),10000);
 demand(counters.sent>0&&counters.sent===counters.acknowledged&&!errors.length&&!s.faults.length,'transfer_background_incomplete');
 report={status:'passed'};
}catch(error){report={status:'failed',error:errorRow(error)};process.exitCode=1;}
finally{
 clearInterval(timer);closing=true;
 report={...report,runId,sourceIdentity:identity,sourceUnchanged:sourceIdentity().sha256===identity.sha256,players:97,connectedBackground:clients.length,measurementStarted:started!==undefined,backgroundPlayers:96,capacity:25,requiredTransfers:200,completedTransfers:transfers.filter(r=>r.status===200).length,durationMs:started?performance.now()-started:null,counters,unacknowledged:clients.reduce((n,c)=>n+c.pending.size,0),errors,fences,routeErrors,processEvents,faults:s?.faults.map(f=>({...f,error:errorRow(f.error)})),transfers,limitations:['97 concurrent native actors keep one free destination slot; separate100-player4x25 performance gate required.','Local native HTTP and TCP WebSockets, signed fixture account service. No live database or deployment.']};
 fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n',{flag:'wx'});transport?.dispose();for(const c of clients)c.ws.terminate();
 const cleanupErrors=[];for(const fn of cleanup.toReversed())try{await fn();}catch(e){cleanupErrors.push(errorRow(e));}if(cleanupErrors.length){report.cleanupErrors=cleanupErrors;report.status='failed';fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');process.exitCode=1;}
 process.stdout.write(JSON.stringify({status:report.status,transfers:report.completedTransfers,error:report.error?.code,errors:errors.length,fences:fences.length})+'\n');
}

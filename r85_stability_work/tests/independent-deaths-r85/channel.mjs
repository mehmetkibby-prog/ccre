import {runChannelProcess} from '../../working/core511-source/scripts/core511/channel-process.mjs';
import {ProcessStream} from '../../working/core511-source/scripts/core511/process-stream.mjs';
await runChannelProcess({afterCreate(runtime){
 const c=runtime.channel,tick=c.kernel.tick.bind(c.kernel);let paused=false;
 if(process.env.R85_DEATH_BATCH_FAILURE==='nonjoined')c.combatCheckpoints.captureR53=()=>null;
 c.kernel.tick=(...args)=>paused?undefined:tick(...args);
 process.on('message',message=>{
  if(message?.type==='test-death-control'){
   if(typeof message.pause==='boolean')paused=message.pause;
   process.send({type:message.type,request:message.request,snapshot:{paused,metrics:c.kernel.metrics,players:[...c.kernel.players].map(([id,p])=>({id,epoch:p.epoch,accepted:p.lastAccepted,applied:p.lastApplied,queue:p.queue.length,barrier:!!p.barrier,suspended:p.suspended,rows:c.view.player(id)})),lanes:[...c.lanes.held.keys()],failure:c.kernel.failure?.message}});return;
  }
  if(message?.type!=='test-browser-connection'||!/^test-browser:[a-f0-9-]{36}$/.test(message.stream))return;
  const socket=new ProcessStream(process,{stream:message.stream,connect:false});Object.defineProperty(socket,'remoteAddress',{value:'127.0.0.'+(runtime.peer.channel+1)});runtime.webSocketEndpoint.server.emit('connection',socket);
 });
}});

import assert from 'node:assert/strict';
import {Core511Transport} from '../../r81-work/core511-source/scripts/core511/generated/client/core511-transport-r79-715e78ecd9021ea8.js';

// The shipped browser transport/prediction is unmodified. A deliberately
// withheld movement ACK models a server/network wait, not observed live timing.
async function run({ability, holdMs}) {
  let clock=0, revision=1;
  const wire=[], due=[];
  const core=new Core511Transport({now:()=>clock,fetch:()=>{throw Error('unexpected fetch');},WebSocket:class {},origin:'https://fixture.invalid',headers:()=>({})});
  Object.assign(core,{ready:true,queuedMovement:true,orderedMovement:true,epoch:1,playerId:'p',motionStreamId:'0123456789abcdef'});
  const own={id:'p',area:'forest',x:0,y:0,hp:100,hp_revision:1,position_revision:1};
  core.world={area:'forest',channel:1,world:{cycle:1},players:[own]};
  core.ws={readyState:1,bufferedAmount:0,send:raw=>{
    const packet=JSON.parse(raw); wire.push({at:clock,...packet});
    if(packet.type!=='input') return;
    if(packet.payload.action==='attack') {
      // Both ordinary and skill lethal hits receive the early202 quickly.
      due.push({at:clock+50,sequence:packet.sequence,status:202,body:{combatPending:true,combatPhase:'pending',rewardPending:false}});
    } else if(packet.payload.action==='move') {
      due.push({at:Math.max(clock+50,holdMs+50),sequence:packet.sequence,status:200,body:{ok:true,x:packet.payload.x,y:packet.payload.y,area:'forest',positionRevision:++revision}});
    }
  }};
  const attack=core.enqueue({action:'attack',ability,targetId:'m',intentId:'test'});
  const samples=[];
  for(clock=0;clock<=1600;clock+=10) {
    // Network delivery is deliberately scheduled independently of rendering.
    for(;;){due.sort((a,b)=>a.at-b.at||a.sequence-b.sequence);if(!due.length||due[0].at>clock)break;const response=due.shift();core.result(response);}
    const position=core.predictFrame({own,seconds:.01,frameAt:clock},(p,dt)=>({x:p.x+100*dt,y:p.y}));
    samples.push({at:clock,x:position.x,pendingMs:Math.round(core.prediction.pending.reduce((n,r)=>n+r.seconds,0)*1000)});
  }
  await attack;
  let start=null,longest=0,periods=[];
  for(let i=1;i<samples.length;i++){
    const still=Math.abs(samples[i].x-samples[i-1].x)<1e-7;
    if(still&&start===null)start=samples[i-1].at;
    if(!still&&start!==null){periods.push({fromMs:start,toMs:samples[i-1].at,durationMs:samples[i-1].at-start});longest=Math.max(longest,samples[i-1].at-start);start=null;}
  }
  assert(samples.every(s=>s.pendingMs<=600));
  assert(wire.filter(p=>p.type==='input'&&p.payload.action==='attack').length===1);
  assert(core.queue.length===0);
  return {ability,withheldMovementUntilMs:holdMs+50,frameIntervalMs:10,longestStationaryMs:longest,periods,canonicalMoves:wire.filter(p=>p.type==='input'&&p.payload.action==='move').map(p=>({at:p.at,sequence:p.sequence}))};
}
const rows=[];
for(const ability of [0,1])for(const holdMs of [200,500,900,1100])rows.push(await run({ability,holdMs}));
assert(rows.find(r=>r.ability===0&&r.withheldMovementUntilMs===550).longestStationaryMs===0);
assert(rows.find(r=>r.ability===0&&r.withheldMovementUntilMs===1150).longestStationaryMs>=500);
console.log(JSON.stringify({scope:'source-exact shipped transport, controlled ACK latency, not a live measurement',rows},null,2));

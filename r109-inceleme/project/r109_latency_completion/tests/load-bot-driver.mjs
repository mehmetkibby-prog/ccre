// Test-only separate process: client decoding/AI never runs on the server heap.
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import {WebSocket} from '/tmp/core511-build-deps/node_modules/ws/wrapper.mjs';
const {Core511Transport}=await import(process.env.STUTTER_TREE+'/core511-source/scripts/core511/client-transport.mjs');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let actors=[],timer,measuring=false,counts={moves:0,attacks:0,replies:0},errors=[],cpu,started;
const snapshot=()=>({pid:process.pid,counts,errors,actors:actors.map(a=>({actor:a.n,channel:a.channel,ready:a.client.ready,queued:a.client.queue.length,busy:a.busy,floors:[...a.floors],currentFloor:a.client.world?.adventure511?.run?.floor})),resources:{cpuMicros:cpu?process.cpuUsage(cpu):null,durationMs:started?performance.now()-started:null,maxRssBytes:process.resourceUsage().maxRSS*1024}});
async function act(a){
 const c=a.client,w=c.world,p=w?.players.find(p=>p.id===a.id),run=w?.adventure511?.run;if(!c.ready||!p||!run||a.busy)return;
 a.floors.add(run.floor);const enemy=w.monsters.filter(m=>m.hp>0).sort((x,y)=>Math.hypot(x.x-p.x,x.y-p.y)-Math.hypot(y.x-p.x,y.y-p.y))[0];if(!enemy)return;
 const now=Date.now(),distance=Math.hypot(enemy.x-p.x,enemy.y-p.y);a.busy=true;
 try{
  if(distance>160&&now-a.lastMove>=230){a.lastMove=now;const step=Math.min(30,distance-150);c.move({action:'move',x:p.x+(enemy.x-p.x)/distance*step,y:p.y+(enemy.y-p.y)/distance*step,area:w.area,basePositionRevision:p.position_revision,requestId:randomUUID()});if(measuring)counts.moves++;}
  else if(distance<=160&&now-a.lastAttack>=900){a.lastAttack=now;if(measuring)counts.attacks++;const r=await c.command({action:'attack',targetId:enemy.id,spawnRound:enemy.spawn_round,ability:0,requestId:randomUUID(),intentId:randomUUID()});if(measuring)counts.replies++;if(r.status!==200)errors.push({actor:a.n,status:r.status,body:r.body});}
 }catch(e){errors.push({actor:a.n,error:e.message});}finally{a.busy=false;}
}
async function command(method,value){
 if(method==='init'){
  const {origin,serverOrigin}=value;actors=value.actors.map(a=>({...a,floors:new Set(),busy:false,lastMove:0,lastAttack:0}));
  for(const a of actors){
   class Socket extends WebSocket{constructor(url){super(url,{origin:serverOrigin});}}
   a.client=new Core511Transport({WebSocket:Socket,origin,headers:()=>({}),fetch:(url,opt)=>fetch(origin+new URL(url).pathname,{...opt,headers:{origin:serverOrigin,cookie:'__Host-yasam-session='+a.token+'; __Host-yasam-csrf='+a.csrf,'X-CSRF-Token':a.csrf,'X-Game-Instance':a.instance,'X-Real-IP':'198.51.100.'+(a.n+1),'content-type':'application/json'}}),notify:(kind,v)=>{if(kind==='error')errors.push({actor:a.n,kind,value:v});}});
   await a.client.replace('character',{channel:a.channel});await a.client.image();assert(a.client.ready,'ready actor '+a.n);
  }
  for(const a of actors){const r=await a.client.command({action:'adventure_tower_enter',requestId:randomUUID()});assert.equal(r.status,200,JSON.stringify(r));}
  const until=Date.now()+15000;while(actors.some(a=>!a.client.world?.adventure511?.run)&&Date.now()<until)await sleep(25);assert(actors.every(a=>a.client.world?.adventure511?.run));
  timer=setInterval(()=>{for(const a of actors)void act(a);},50);return {players:actors.length,pid:process.pid};
 }
 if(method==='begin'){assert.deepEqual(errors,[]);measuring=true;cpu=process.cpuUsage();started=performance.now();return {started:true};}
 if(method==='end'){measuring=false;clearInterval(timer);const until=Date.now()+10000;while(actors.some(a=>a.busy)&&Date.now()<until)await sleep(10);return snapshot();}
 if(method==='snapshot')return snapshot();
 if(method==='close'){clearInterval(timer);for(const a of actors)a.client?.dispose();return {closed:true};}
 throw Error('unknown test command');
}
process.on('message',m=>{void command(m.method,m.value).then(result=>process.send?.({id:m.id,result}),error=>process.send?.({id:m.id,error:{message:error.message,stack:error.stack}}));});
process.on('disconnect',()=>{clearInterval(timer);for(const a of actors)a.client?.dispose();process.exit(0);});

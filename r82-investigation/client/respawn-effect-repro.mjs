// Exact shipped R79 React effect/callback bodies, isolated hook/clock/HTTP
// fixtures. This demonstrates client control flow, not a live VDS diagnosis.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createHash} from 'node:crypto';

const file=new URL('../../r81-work/core511-source/scripts/core511/generated/client/game-client-core511-r79-51fbce3bd7351cf0.js',import.meta.url);
const source=fs.readFileSync(file,'utf8');
const start=source.indexOf('  (0, R.useEffect)(() => {\n    if (!Ea2 || !Db || wb > 0)');
const end=source.indexOf('\n  let Ub =',start);
assert(start>=0&&end>start,'unique shipped respawn effect');
export const shippedEffect=source.slice(start,end);
const reviveStart=source.indexOf('  let fm2 = (0, R.useCallback)((e4) => {');
const reviveEnd=source.indexOf('}, []), mm2 =',reviveStart);
assert(reviveStart>=0&&reviveEnd>reviveStart);
const revive=source.slice(reviveStart,reviveEnd)+'}, []);';
const arenaStart=source.indexOf('function colArenaWaiting498('),arenaEnd=source.indexOf('\nfunction ',arenaStart+1);
const arena=source.slice(arenaStart,arenaEnd);
export const sourceHash=createHash('sha256').update(source).digest('hex');

export function harness({effect=shippedEffect,response,clockOffset=0}={}){
 let clock=1_000_000+clockOffset,serial=0,lastDeps,cleanup,requests=0,refreshes=0,renderCount=0;
 const jobs=new Map(),http=[];
 const setTimeout=(fn,ms)=>{const id=++serial;jobs.set(id,{fn,at:clock+Number(ms)});return id;};
 const clearTimeout=id=>jobs.delete(id),ref=current=>({current});
 const own={id:'p',hp:0,max_hp:100,hp_revision:10,respawn_at_ms:1_002_600,area:'forest',x:1,y:2};
 const world={area:'forest',channel:1,world:{cycle:1},players:[own]};
 const sandbox={
  Date:{now:()=>clock},Number,Math,Map,Set,
  window:{setTimeout,clearTimeout},
  R:{useCallback:fn=>fn,useEffect:(fn,deps)=>{
   if(lastDeps&&deps.every((value,i)=>Object.is(value,lastDeps[i])))return;
   cleanup?.();lastDeps=deps;cleanup=fn();
  }},
  F2:ref(world),g2:ref('p'),D2:ref(10),oe2:ref(9),w2:ref(0),ce2:ref(true),le2:ref(false),
  Sr2:ref({stop:()=>{}}),wr2:ref({stop:()=>{}}),b2:ref({x:1,y:2}),St2:ref(1),
  Dt2:ref(null),At2:ref(null),pe2:ref(null),Si2:ref({x:0,y:0}),
  rr2:ref(new Map()),ir2:ref(new Map()),_e2:ref(1),$g:{x:0,y:0},
  We:{x:0,y:0},de:{x:0,y:0},Pe:{x:0,y:0},ze:{x:0,y:0},n_:{x:0,y:0},tt:{x:0,y:0},a_:{x:0,y:0},
  isAdventureArea511:()=>false,
  Kt:()=> 'fixture-instance',kernel511:()=>sandbox.core,
  core:{epoch:1,active:null,movementBehind:null,queue:[],playerId:'p'},
  xo2:hp=>{sandbox.Ho2=hp;},ca2:()=>{},Ho2:0,
  Zp2:()=>{},J:async()=>{refreshes++;},xp2:()=>clock-clockOffset,
  Q:async(url,payload)=>{
   assert.equal(url,'/api/action');assert.equal(payload.action,'respawn');requests++;
   if(response)return response(requests,sandbox);
   return new Promise((resolve,reject)=>http.push({resolve,reject}));
  },
 };
 vm.createContext(sandbox);vm.runInContext(arena+'\n'+revive,sandbox);
 function render(){
  const current=sandbox.F2.current,player=current?.players.find(p=>p.id===sandbox.g2.current);
  sandbox.inputs={Ea2:true,Db:!!player,wb:player?.hp??sandbox.Ho2,Eb:player?.respawn_at_ms??0,
   Nv2:player?.max_hp??100,U2:current,X2:player,Bo2:sandbox.g2.current};
  vm.runInContext('(function(){const {Ea2,Db,wb,Eb,Nv2,U2,X2,Bo2}=inputs;'+effect+'})()',sandbox);
  renderCount++;
 }
 async function flush(){for(let i=0;i<15;i++)await Promise.resolve();}
 async function advance(ms){
  const target=clock+ms;
  for(;;){
   const next=[...jobs].filter(([,job])=>job.at<=target).sort((a,b)=>a[1].at-b[1].at||a[0]-b[0])[0];
   if(!next)break;
   const [id,job]=next;clock=job.at;jobs.delete(id);job.fn();await flush();
  }
  clock=target;await flush();
 }
 return {sandbox,http,jobs,render,advance,flush,cleanup:()=>cleanup?.(),
  requests:()=>requests,refreshes:()=>refreshes,renderCount:()=>renderCount,
  now:()=>clock,nextAt:()=>Math.min(Infinity,...[...jobs.values()].map(job=>job.at)),
 };
}

if(process.argv[1]===new URL(import.meta.url).pathname){
 const rows=[];
 for(const field of ['channel','cycle']){
  const h=harness();h.render();await h.advance(2680);assert.equal(h.requests(),1);
  const before=h.sandbox.F2.current;
  h.sandbox.F2.current=field==='channel'?{...before,channel:2}:{...before,world:{cycle:2}};
  h.render(); // Actual source dependency array does not notice this change.
  h.http[0].resolve({ok:true,hp:100,maxHp:100,hpRevision:11,area:'forest',x:1,y:2});
  await h.flush();await h.advance(60000);
  assert.equal(h.requests(),1);assert.equal(h.refreshes(),0);assert.equal(h.jobs.size,0);
  assert.equal(h.sandbox.le2.current,true);assert.equal(h.sandbox.Ho2,0);
  rows.push({case:'scope '+field+' changed during respawn',requests:h.requests(),busy:h.sandbox.le2.current,dead:h.sandbox.Ho2===0,refreshes:h.refreshes(),scheduledRetries:h.jobs.size,elapsedAfterReplyMs:60000});
  h.cleanup();
 }
 const stale=harness({response:()=>({ok:true,hp:100,maxHp:100,hpRevision:9,area:'forest',x:1,y:2})});
 stale.render();await stale.advance(62680);
 assert.equal(stale.requests(),1);assert.equal(stale.sandbox.Ho2,0);assert.equal(stale.refreshes(),0);assert.equal(stale.jobs.size,0);
 rows.push({case:'successful response rejected by existing revision guard',requests:stale.requests(),busy:stale.sandbox.le2.current,dead:true,refreshes:stale.refreshes(),scheduledRetries:stale.jobs.size});
 stale.cleanup();
 const normal=harness({response:()=>({ok:true,hp:100,maxHp:100,hpRevision:11,area:'forest',x:1,y:2})});
 normal.render();await normal.advance(2680);assert.equal(normal.sandbox.Ho2,100);assert.equal(normal.sandbox.le2.current,false);
 rows.push({case:'ordinary successful respawn control',requests:normal.requests(),hp:normal.sandbox.Ho2,busy:normal.sandbox.le2.current,refreshes:normal.refreshes()});normal.cleanup();
 console.log(JSON.stringify({scope:'exact shipped client effect; controlled timing and reply; not a live diagnosis',sourceHash,rows},null,2));
}

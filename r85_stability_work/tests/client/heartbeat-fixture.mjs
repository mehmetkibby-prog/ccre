import assert from 'node:assert/strict';
import {fixture,gameSource,gamePath} from './source-fixture.mjs';

export function heartbeatExcerpts(source){
 const prefix='zp2 = (0, R.useCallback)(',start=source.indexOf(prefix)+prefix.length,end=source.indexOf(', []), J = (0, R.useCallback)',start);
 const schedulerStart=source.indexOf('    if (!Ea2 || !Np2) return;',end),schedulerEnd=source.indexOf('\n  }, [Np2, Ea2, zp2, Rp2])',schedulerStart);
 const budgetStart=source.indexOf('function nl('),budgetEnd=source.indexOf('function rl(',budgetStart);
 const healthStart=source.indexOf('function mg('),healthEnd=source.indexOf('function Sg(',healthStart);
 assert(start>prefix.length&&end>start&&schedulerStart>end&&schedulerEnd>schedulerStart&&budgetEnd>budgetStart&&healthEnd>healthStart);
 return {callback:source.slice(start,end),scheduler:source.slice(schedulerStart,schedulerEnd),budget:source.slice(budgetStart,budgetEnd),health:source.slice(healthStart,healthEnd)};
}
export function installIntervals(f){
 const intervals=new Map();let serial=100000;
 f.context.window.setInterval=(fn,delay)=>{
  const id=++serial,row={timer:null};intervals.set(id,row);
  const tick=()=>{fn();if(intervals.has(id))row.timer=f.clock.set(tick,delay);};
  row.timer=f.clock.set(tick,delay);return id;
 };
 f.context.window.clearInterval=id=>{const row=intervals.get(id);if(row){f.clock.clear(row.timer);intervals.delete(id);}};
 return ()=>{for(const id of intervals.keys())f.context.window.clearInterval(id);};
}
export function heartbeatFixture({source=gameSource,...options}={}){
 const f=fixture({source,...options}),ref=current=>({current}),errors=[],health=[],excerpts=heartbeatExcerpts(source),clearIntervals=installIntervals(f);
 Object.assign(f.context,{tl:5000,ke2:ref(null),je2:ref(null),Me2:ref(0),F2:ref({players:[{id:'fixture-player',hp:100,max_hp:100,hp_revision:1}],settings:{player_max_hp:100}}),g2:ref('fixture-player'),D2:ref(1),w2:ref(100),ce2:ref(false),ir2:ref(new Map()),v2:ref(true),Ea2:true,Np2:true,xo2:value=>health.push(typeof value==='function'?value(f.context.w2.current):value),Rp2:error=>errors.push({at:f.clock.now,name:error.name,message:error.message})});
 f.evaluate(excerpts.budget+'\n'+excerpts.health+'\nje2.current=nl();\nglobalThis.zp2='+excerpts.callback+';\nglobalThis.startHeartbeat=()=>{'+excerpts.scheduler+'\n};',gamePath+'#exact-zp2-nl-scheduler');
 return {...f,errors,health,excerpts,dispose(){clearIntervals();f.dispose();}};
}

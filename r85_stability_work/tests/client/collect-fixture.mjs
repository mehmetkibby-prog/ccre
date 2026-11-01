import assert from 'node:assert/strict';
import {fixture,gameSource,gamePath} from './source-fixture.mjs';
export function collectExcerpts(source){
 const prefix='let Tm2 = (0, R.useCallback)(';
 const start=source.indexOf(prefix)+prefix.length,end=source.indexOf(', [Zp2, Y2, J]), km2 =',start);
 assert(start>prefix.length&&end>start);
 const manualStart=source.indexOf(', [Zp2, Y2, J]), km2 = (0, R.useCallback)(',end)+', [Zp2, Y2, J]), km2 = (0, R.useCallback)('.length;
 const manualEnd=source.indexOf(', [Tm2]);',manualStart);
 assert(manualEnd>manualStart);
 const pollPrefix='let e4 = window.setInterval(() => {',pollStart=source.indexOf(pollPrefix,end)+pollPrefix.length,pollEnd=source.indexOf('\n    }, 120);',pollStart);
 assert(pollStart>pollPrefix.length&&pollEnd>pollStart);
 return {callback:source.slice(start,end),manual:source.slice(manualStart,manualEnd),poll:source.slice(pollStart,pollEnd)};
}
export function collectFixture({source=gameSource,drops=1,...options}={}){
 const f=fixture({source,...options}),world={world:{cycle:1},area:'forest',channel:1,players:[{id:'fixture-player',x:100,y:100,hp:100,potions:5}],drops:Array.from({length:drops},(_,i)=>({id:'drop-'+i,kind:'essence',collectible_at:0,monster_id:'forest-'+i,x:100,y:100})),inventory:[]};
 const ref=current=>({current});
 const notifications=[];
 Object.assign(f.context,{Dr2:ref(new Set()),fr2:ref(0),bagGuardR41:ref({reject:()=>false,warnOverflow:()=>{},allowAuto:()=>true}),kr2:ref(new Map()),Or2:ref(new Map()),Ar2:ref({monsterId:null,at:0}),F2:ref(world),W2:ref(null),b2:ref({x:100,y:100}),v2:ref(true),g2:ref('fixture-player'),_e2:ref(0),at2:ref(false),I2:ref(false),$t2:ref({serverTime:0,observedAt:0}),K2:()=>{},J:async()=>{},ca2:()=>{},du:()=>false,Zp2:()=>{},Y2:()=>{},colLoot489:{add:(id,message)=>notifications.push({id,message})},colEnhanceName491:()=>null,colRuneCoast483:()=>false});
 const excerpts=collectExcerpts(source);
 f.evaluate('globalThis.Tm2='+excerpts.callback+';\nglobalThis.km2='+excerpts.manual+';\nglobalThis.pollAuto=()=>{'+excerpts.poll+'\n};',gamePath+'#exact-Tm2-auto-manual');
 return {...f,excerpts,world,notifications};
}

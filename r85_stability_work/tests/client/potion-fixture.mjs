import assert from 'node:assert/strict';
import {fixture,gameSource,gamePath} from './source-fixture.mjs';
export function potionExcerpt(source){
 const section=source.indexOf('let hg2 = (0, R.useRef)(false), Cg2 = (0, R.useRef)(0);');
 const prefix='let e4 = window.setInterval(() => {',start=source.indexOf(prefix,section)+prefix.length,end=source.indexOf('\n    }, 500);',start);
 assert(section>0&&start>section&&end>start);
 return source.slice(start,end);
}
export function potionFixture({source=gameSource,dungeon=false,...options}={}){
 const f=fixture({source,...options}),ref=current=>({current});
 const player={id:'fixture-player',hp:20,max_hp:100,auto_potion_owned:1,auto_potion_enabled:1};
 Object.assign(f.context,{F2:ref({world:{cycle:1},area:'forest',players:[player]}),W2:ref(dungeon?{run:{members:[{id:'fixture-player',hp:20,maxHp:100}]}}:null),g2:ref(player.id),hg2:ref(false),Cg2:ref(0),nt2:ref({active:()=>false}),Qe2:ref(false),I2:ref(false),Ce2:ref(async()=>{}),fa2:()=>{}});
 const excerpt=potionExcerpt(source);
 f.evaluate('globalThis.pollPotion=()=>{'+excerpt+'\n};',gamePath+'#exact-auto-potion');
 return {...f,excerpt,player};
}

import {NativeWorldClockRules} from './generated/world-clock-rules.mjs';
import {demand} from './contract.mjs';
import {worldClockDeferR533} from './r533-options.mjs';

// Native clocks over authoritative resident maps; no SQL, timer or player
// allocation. The containing process supplies scheduling and durable drains.
export class WorldClock extends NativeWorldClockRules {
 constructor({view,owns,blocked,changed,clock=Date.now}){
  super();for(const fn of [owns,blocked,changed,clock])demand(typeof fn==='function','world_clock_dependencies');
  demand(view?.monsters instanceof Map&&view?.engagedByMonster instanceof Map,'world_clock_maps');
  Object.assign(this,{view,owns,blocked,now:clock,monsters:view.monsters,engagements:view.engagements,engagedByMonster:view.engagedByMonster});this.regenClocks=new Map();this.config=new Map();
  this.combat={enabled:true,updateMonster:(row,patch)=>{
   // The deadline can expire during the synchronous native calculation.
   // A temporary busy/deadline state does not invalidate this OS owner.
   if(worldClockDeferR533){demand(owns(row),'world_monster_fenced');if(blocked(row.id))return false;}
   else demand(owns(row)&&!blocked(row.id),'world_monster_fenced');
   const next={...row,...patch};view.setMonster(next);changed({monsters:[next]});
  }};
 }
 monster(id){return this.view.monster(id);}
 forget(id){this.regenClocks.delete(id);}
}

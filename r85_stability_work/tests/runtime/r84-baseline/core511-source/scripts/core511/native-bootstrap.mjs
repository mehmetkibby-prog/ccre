import {residentCapacityR59,channelAdmissionR59,castleResumeR59} from './castle-capacity-r59.mjs';
import {CHANNELS,CAPACITY,selectChannel,demand} from './contract.mjs';
import {channelBalanceView504,channelOccupancy504} from '../../../native510-bb3a6cc689c6/vds-server/src/channel-balance504.mjs';
import {feature510} from '../../../native510-bb3a6cc689c6/vds-server/src/features510.mjs';
import {feature504} from '../../../native510-bb3a6cc689c6/vds-server/src/features504.mjs';

// Cold entry display shares the admission authority's exact slot counts.
// Disconnected admissions retain their slot; passive rooms and recent SQL
// player rows without admission do not consume one. Never runs legacy seed.
export class NativeBootstrap {
 constructor(core){this.core=core;}
 // Display-only committed snapshot. Actual entry/transfer still rechecks the
 // serialized authority; this method never admits, transfers, or retires actors.
 // Keep this body synchronous between the guards and the final SELECT so the
 // main-thread writer cannot interleave an uncommitted transaction.
 async display(work){
  const c=this.core;
  demand(c.database.core511Bootstrap===this&&!c.closed,'native_bootstrap_binding');
  demand(!c.stopping,'coordinator_stopping');
  demand(!c.recoveringWorld&&!c.globalWorld?.held&&!c.globalWorld?.recovery,'global_world_busy');
  demand(c.database.sqlite.isTransaction===false,'native_bootstrap_write_in_progress');
  return work();
 }
 dedicatedReady(area){const c=this.core;demand(c.database.core511Bootstrap===this&&!c.closed&&area==='ancient','native_expansion_readiness_scope');return c.host?.nativeHttp?.health().status===200;}
 counts(){const c=this.core,rows=c.database.sqlite.prepare('SELECT channel,COUNT(*) AS count FROM kernel511_admissions GROUP BY channel').all();demand(rows.every(r=>CHANNELS.includes(r.channel)&&Number.isSafeInteger(r.count)&&r.count>=0&&r.count<=residentCapacityR59(r.channel)),'native_bootstrap_admissions');return new Map(rows.map(r=>[r.channel,r.count]));}
 channels(session){
  const c=this.core;demand(c.database.core511Bootstrap===this&&!c.closed&&session?.account?.id,'native_bootstrap_binding');
  return this.display(()=>{
   const counts=this.counts(),rows=[...counts].map(([channel,count])=>({channel,count})),id=session.player?.id;
   const player=id?c.database.sqlite.prepare('SELECT channel,area,hp,last_seen,respawn_at_ms,combat_lock_until_ms,arena_match_id FROM players WHERE id=? AND account_id=?').get(id,session.account.id):null;
   const lab=Boolean(globalThis.__colLoadLab?.accountRun(session.account.id)),view=channelBalanceView504(rows,player,c.clock(),lab||Boolean(id&&!player));
   if(view.balance504){view.balance504.recommendedChannel=selectChannel(counts);if(id&&c.authority.admission(id))view.balance504.autoEligible=false;}
   return {capacity:CAPACITY,...view,channels:CHANNELS.map(id=>({id,name:'Kanal '+id,online:counts.get(id)??0,capacity:CAPACITY,...(feature510('channelBalance')||feature504('channelBalance')?{occupancy504:channelOccupancy504(counts.get(id)??0,CAPACITY)}:{})}))};
  });
 }
 read(){
  const c=this.core;demand(c.database.core511Bootstrap===this&&!c.closed,'native_bootstrap_binding');
  return this.display(()=>{
   const counts=this.counts();
   return {capacity:CAPACITY,channels:CHANNELS.map(id=>({id,name:'Kanal '+id,online:counts.get(id)??0,capacity:CAPACITY}))};
  });
 }
}

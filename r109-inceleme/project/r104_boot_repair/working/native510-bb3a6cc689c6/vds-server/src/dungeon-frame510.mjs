import {feature510} from './features510.mjs';
// ChannelDungeonTransaction publishes a new room object after each successful
// operation. Failed/pending plans remain private. Weak keys expire on replacement.
export function dungeonFrames510(engine){
 const cache=new WeakMap();const stats={builds:0,hits:0};
 return {stats,project(run,viewer){
  if(!feature510('dungeonSnapshot')||!engine.publishedRoomVersions510)return engine.publicRun(run,viewer);
  const at=engine.now(),self=run.members.find(p=>p.id===viewer);
  const key=self?.gmInvisible?viewer:'';
  const visibility=run.members.map(p=>p.id+':'+Boolean(p.gmInvisible)+':'+(p.visibilityRevision??0)).join('|');
  let views=cache.get(run);if(!views){views=new Map();cache.set(run,views);}
  let old=views.get(key);
  if(!old||old.visibility!==visibility||at<old.at||at>=old.until){
   const value=engine.publicRun(run,viewer);let until=Infinity;
   for(const p of run.members)for(const end of [p.inputAt+801,p.stats?.arenaWingsExpiresAt477,p.stats?.pumpkinUntil499,p.appearance?.premiumBuff?.pumpkinUntil])if(end>at)until=Math.min(until,end);
   old={value,visibility,at,until};views.set(key,old);stats.builds++;
  }else stats.hits++;
  // Presence and server time intentionally stay fresh without re-projecting
  // appearance, stats, effects or the shared room. Never mutate cached members.
  const seen=new Map(run.members.map(p=>[p.id,p.seen]));
  return {...old.value,serverTime:at,members:old.value.members.map(p=>({...p,seen:seen.get(p.id)}))};
 }};
}

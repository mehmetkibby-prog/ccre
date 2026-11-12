import {timedPlayerView,timedPlayerDeadline} from './timed-player-view.mjs';

// Only already-public rows enter this cache. Keep at most the current room's
// projected roster; never retain a departed row or a private owner snapshot.
export class PublicPlayerCache {
 constructor({view,mounts,toolFor=null,gatherFor=null}){this.view=view;this.mounts=mounts;this.toolFor=toolFor;this.gatherFor=gatherFor;this.rows=new Map();}
 project(rows,now){
  const next=new Map(),values=[],enabled=Boolean(this.mounts?.enabled);
  for(const row of rows){
   const live=this.view.player(row.id);
   // active() can dismount on an ownership/combat/area change even if no row
   // identity changed. Validate it on every projection, including cache hits.
   const mount=enabled?this.mounts.public(row.id):undefined,tool=this.toolFor?.(row.id)??'',gather=this.gatherFor?.(row.id,now)??null,previous=this.rows.get(row.id);
   let entry=previous;
   if(!entry||entry.gather!==gather||entry.tool!==tool||entry.row!==row||entry.live!==live||entry.enabled!==enabled||entry.mount!==mount||now<entry.at||now>=entry.until){
    const base=timedPlayerView(row,live,now),timed=tool||Object.hasOwn(base,'equippedToolR93')?{...base,equippedToolR93:tool}:base,cosmetic=live?.area==='zumrut'||Object.hasOwn(timed,'gatherR96')?{...timed,gatherR96:gather}:timed,value=enabled?{...cosmetic,mount}:cosmetic;
    entry={row,live,enabled,mount,tool,gather,at:now,until:Math.min(timedPlayerDeadline(row,live,now),gather?.finishAtMs??Infinity),value};
   }
   next.set(row.id,entry);values.push(entry.value);
  }
  this.rows=next;return values;
 }
 forget(id){this.rows.delete(id);}
 clear(){this.rows.clear();}
}

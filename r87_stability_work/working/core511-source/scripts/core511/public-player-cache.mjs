import {timedPlayerView,timedPlayerDeadline} from './timed-player-view.mjs';

// Only already-public rows enter this cache. Keep at most the current room's
// projected roster; never retain a departed row or a private owner snapshot.
export class PublicPlayerCache {
 constructor({view,mounts}){this.view=view;this.mounts=mounts;this.rows=new Map();}
 project(rows,now){
  const next=new Map(),values=[],enabled=Boolean(this.mounts?.enabled);
  for(const row of rows){
   const live=this.view.player(row.id);
   // active() can dismount on an ownership/combat/area change even if no row
   // identity changed. Validate it on every projection, including cache hits.
   const mount=enabled?this.mounts.public(row.id):undefined,previous=this.rows.get(row.id);
   let entry=previous;
   if(!entry||entry.row!==row||entry.live!==live||entry.enabled!==enabled||entry.mount!==mount||now<entry.at||now>=entry.until){
    const timed=timedPlayerView(row,live,now),value=enabled?{...timed,mount}:timed;
    entry={row,live,enabled,mount,at:now,until:timedPlayerDeadline(row,live,now),value};
   }
   next.set(row.id,entry);values.push(entry.value);
  }
  this.rows=next;return values;
 }
 forget(id){this.rows.delete(id);}
 clear(){this.rows.clear();}
}

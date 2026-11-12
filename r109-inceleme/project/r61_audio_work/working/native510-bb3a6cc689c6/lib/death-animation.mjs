// A confirmed death starts on this client's monotonic clock. Server wall-clock
// offset and respawn policy must never postpone the visual reaction.
export function confirmedDeathProgress(states,id,hp,lifeToken,now){
 if(hp>0){states.delete(id);return 0;}
 let state=states.get(id);
 if(!state||state.lifeToken!==lifeToken){state={lifeToken,startedAt:now};states.set(id,state);if(states.size>512)states.delete(states.keys().next().value);}
 return Math.max(.02,Math.min(1,(now-state.startedAt)/480));
}

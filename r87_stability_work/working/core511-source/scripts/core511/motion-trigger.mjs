// V510 drizzle/0056_complex_pandemic.sql: players_record_stationary_time.
// Reproduce the original trigger when a resident action changes coordinates;
// the later five-second checkpoint must not replace this with its flush time.
export function motionTrigger(previous,next,nowMs=Date.now()){
 if(!Object.hasOwn(previous,'last_movement_at_ms'))return next;
 if(['x','y','area','channel'].some(key=>next[key]!==previous[key]))return {...next,last_movement_at_ms:Math.floor(nowMs/1000)*1000};
 return next;
}

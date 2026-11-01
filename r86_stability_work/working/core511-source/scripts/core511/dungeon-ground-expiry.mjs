import {groundLoot30s} from './ground-loot-expiry.mjs';

// Group and solo rewards are created in their completion transaction, which
// sets deadline = reward time + 60 seconds. Use that persisted clock: retrying,
// reopening the panel or restoring a room cannot restart the loot lifetime.
// All drops in that reward cluster share this deadline; no per-item scan/timer.
export function dungeonGroundLootDeadline(run){
 return groundLoot30s&&run.status==='complete'&&
  (run.mode===undefined||run.mode==='group'||run.mode==='solo')&&
  Number.isFinite(run.deadline)?run.deadline-30000:Infinity;
}
export function dungeonGroundLootExpired(run,now){
 return now>=dungeonGroundLootDeadline(run);
}
export function liveDungeonGroundLoot(run,now){
 return dungeonGroundLootExpired(run,now)?[]:run.groundLoot??[];
}

import {FROZEN_WATER_SPAWN,OLD_FROZEN_WATER_SPAWN} from '../../lib/frozen-water-position.mjs';

export function ensureFrozenWaterReach(db){
 // Coordinate guard makes this idempotent; never reset health, rewards or timers.
 return db.prepare("UPDATE monsters SET x=?,y=? WHERE area='frozen' AND variant='frost_water' AND id IN ('frozen-water-c1','frozen-water-c2','frozen-water-c3') AND x=? AND y=?")
  .run(FROZEN_WATER_SPAWN.x,FROZEN_WATER_SPAWN.y,OLD_FROZEN_WATER_SPAWN.x,OLD_FROZEN_WATER_SPAWN.y);
}

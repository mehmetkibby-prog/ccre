import {EVENT_WORLD444,eventWalkable444,eventSegment444} from './event-island444.mjs';
import {guildArea,guildWalkable,guildSegment,GUILD_VILLAGE_WORLD,GUILD_HALL_WORLD} from './guild-village.mjs';
import {DRAGON_WORLD} from './dragon-boss.mjs';
import {ANCIENT_WORLD} from "./expansion65.mjs";
import {AFK_WORLD,AFK_SPAWN} from "./afk-island.mjs";
export {AFK_WORLD,AFK_SPAWN};
import {FOREST_CORE_OBSTACLE,insideForestCore,forestCoreSegment} from "../realtime-server/src/forest-core.mjs";
import {ANCIENT_CORE_OBSTACLE,insideAncientCore,ancientCoreSegment} from "./ancient-core.mjs";
export {FOREST_CORE_OBSTACLE};
export {ANCIENT_CORE_OBSTACLE};
export const WAR_WORLD = { width: 3600, height: 2250 } as const;
export const WAR_SAFE = {x:1800,y:996,radiusX:450,radiusY:342} as const;
export function inWarSafeZone(x:number,y:number) { return ((x-WAR_SAFE.x)/WAR_SAFE.radiusX)**2+((y-WAR_SAFE.y)/WAR_SAFE.radiusY)**2<=1; }
export const COMMON_WORLD = { width: 2400, height: 1500 } as const;
export const BLACK_WORLD = { width: 5400, height: 3375 } as const;
export const BLACK_SPAWN = { x: 2700, y: 2925 } as const;
export const FOREST_WORLD = { width: 5400, height: 3375 } as const;
export const FROZEN_WORLD = { width: 4800, height: 3000 } as const;
export const FROZEN_UNLOCK_LEVEL = 20;

export const FOREST_CORE = { x: 2700, y: 1687.5 } as const;
export const FOREST_SPAWN = { x: 2700, y: 2025 } as const;
export const BAZAAR_SPAWN = { x: 1200, y: 920 } as const;
// Güneydoğudaki açık kar yolu; ön plandaki kaya ve ağaç siluetlerinin üstüne
// doğmayı önler ve merkez boss alanından güvenli uzaklıkta başlatır.
export const FROZEN_SPAWN = { x: 3525, y: 2325 } as const;
export const FROZEN_BOSS_SPAWN = { x: 2400, y: 1500 } as const;
export {FROZEN_WATER_SPAWN} from './frozen-water-position.mjs';
export const FROZEN_LAKE = { x: 4170, y: 495, radiusX: 780, radiusY: 555 } as const;
export const FISHING_LAKE = { x: 1200, y: 745, radiusX: 735, radiusY: 445 } as const;

// İlk Kuzey Ormanı'nın açık av alanı. Dekoratif kenarlara taşmadan bütün
// eski sabit yaratık slotlarına ve giriş noktasına erişilebilir.
export const FOREST_WALKABLE_POLYGON = [
  [45, 65], [5355, 65], [5355, 3330], [45, 3330],
] as const;

export function areaWorld(area: string | null | undefined) {
  if(area==='event')return EVENT_WORLD444;
  const social=guildArea(area);if(social)return social.kind==='village'?GUILD_VILLAGE_WORLD:GUILD_HALL_WORLD;
  if(area === "dragon")return DRAGON_WORLD;
  if(area === "afk")return AFK_WORLD;
  if(area === "ancient")return ANCIENT_WORLD;
  return area === "war" ? WAR_WORLD : area === "black" ? BLACK_WORLD : area === "frozen" ? FROZEN_WORLD : area === "forest" ? FOREST_WORLD : COMMON_WORLD;
}

function insideForestBounds(x: number, y: number) {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return false;
  let inside = false;
  for (let index = 0, previous = FOREST_WALKABLE_POLYGON.length - 1; index < FOREST_WALKABLE_POLYGON.length; previous = index, index += 1) {
    const [x1, y1] = FOREST_WALKABLE_POLYGON[index];
    const [x2, y2] = FOREST_WALKABLE_POLYGON[previous];
    const cross = (x - x1) * (y2 - y1) - (y - y1) * (x2 - x1);
    if (Math.abs(cross) < 1e-7 && x >= Math.min(x1, x2) && x <= Math.max(x1, x2) && y >= Math.min(y1, y2) && y <= Math.max(y1, y2)) return true;
    if ((y1 > y) !== (y2 > y) && x < ((x2 - x1) * (y - y1)) / (y2 - y1) + x1) inside = !inside;
  }
  return inside;
}

export function isForestWalkablePosition(x:number,y:number){return insideForestBounds(x,y)&&!insideForestCore(x,y);}

// Donmuş Çam Geçidi'nin sağ üst gölü gerçek bir engeldir. İç harabeler kısa
// tutulduğu için yalnız dış uçurumlar ve göl bloke edilir; böylece tıkla-yürü
// kullanan oyuncu dekorların arasında sıkışmaz.
export function isFrozenWalkablePosition(x: number, y: number) {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return false;
  if (x < 55 || x > FROZEN_WORLD.width - 55 || y < 80 || y > FROZEN_WORLD.height - 55) return false;
  const lake = ((x - FROZEN_LAKE.x) / FROZEN_LAKE.radiusX) ** 2 + ((y - FROZEN_LAKE.y) / FROZEN_LAKE.radiusY) ** 2;
  return lake > 1;
}

export function isAreaWalkablePosition(area: string | null | undefined, x: number, y: number) {
  if(area==='event')return eventWalkable444(x,y);
  if(guildArea(area))return guildWalkable(area,x,y);
  if (area === "forest") return isForestWalkablePosition(x, y);
  if (area === "frozen") return isFrozenWalkablePosition(x, y);
  const world = areaWorld(area);
  if (!Number.isFinite(x) || !Number.isFinite(y) || x < 55 || x > world.width - 55 || y < 80 || y > world.height - 55) return false;
  if (area === "ancient" && insideAncientCore(x,y)) return false;
  if (area === "arena" && (x < 280 || x > 2120 || y < 250 || y > 1250)) return false;
  if (area === "fishing") {
    const lake = ((x - FISHING_LAKE.x) / FISHING_LAKE.radiusX) ** 2 + ((y - FISHING_LAKE.y) / FISHING_LAKE.radiusY) ** 2;
    return lake >= 1.02;
  }
  return true;
}

export function isAreaWalkableSegment(
  area: string | null | undefined,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
) {
  if(area==='event')return eventSegment444(fromX,fromY,toX,toY);
  if(guildArea(area))return guildSegment(area,fromX,fromY,toX,toY);
  if(area === "forest") return insideForestBounds(fromX,fromY)&&insideForestBounds(toX,toY)&&forestCoreSegment(fromX,fromY,toX,toY);
  if(area === "ancient")return [fromX,fromY,toX,toY].every(Number.isFinite)
    && fromX>=55 && fromX<=ANCIENT_WORLD.width-55 && fromY>=80 && fromY<=ANCIENT_WORLD.height-55
    && toX>=55 && toX<=ANCIENT_WORLD.width-55 && toY>=80 && toY<=ANCIENT_WORLD.height-55
    && ancientCoreSegment(fromX,fromY,toX,toY);
  if (!isAreaWalkablePosition(area, fromX, fromY) || !isAreaWalkablePosition(area, toX, toY)) return false;
  // Outside-lake endpoints do not prove the chord between them is walkable.
  // Sampling every 24 units missed short chords and disagreed after path
  // compression. In ellipse coordinates the closest point is exact and O(1).
  const lake = area === "frozen" ? FROZEN_LAKE : area === "fishing" ? FISHING_LAKE : null;
  if (lake) {
    const ax = (fromX - lake.x) / lake.radiusX, ay = (fromY - lake.y) / lake.radiusY;
    const dx = (toX - fromX) / lake.radiusX, dy = (toY - fromY) / lake.radiusY;
    const squared = dx * dx + dy * dy;
    const ratio = squared ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / squared)) : 0;
    const closest = (ax + ratio * dx) ** 2 + (ay + ratio * dy) ** 2;
    if (area === "frozen" ? closest <= 1 : closest < 1.02) return false;
  }
  return true;
}

export function clampAreaPosition(area: string | null | undefined, x: number, y: number, padding = 55) {
  const world = areaWorld(area);
  return {
    x: Math.max(padding, Math.min(world.width - padding, x)),
    y: Math.max(padding, Math.min(world.height - padding, y)),
  };
}

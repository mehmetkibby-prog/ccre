// Shared world coordinates for server authority and the scrolling game camera.
export const DUNGEON_MAP_VERSION = 2;
export const DUNGEON_WORLD = Object.freeze({ width: 2400, height: 1500, speed: 240, minX: 180, maxX: 2220, minY: 180, maxY: 1340 });
export const DUNGEON_PORTAL = Object.freeze({ x: 1200, y: 185 });
const SEAL_PORTAL = Object.freeze({ x: DUNGEON_WORLD.width / 2, y: DUNGEON_WORLD.height / 2 });
export function dungeonPortal(stage) { return stage === 1 ? SEAL_PORTAL : DUNGEON_PORTAL; }
export const DUNGEON_MAPS = Object.freeze([
    null,
    { id: 'seal_forest', name: 'Mühür Ormanı', image: '/dungeon/seal-forest-v202.webp', objective: 'Kırık Mühürler', spawn: { x: 1200, y: 1190 } },
    { id: 'core_valley', name: 'Çekirdek Vadisi', image: '/dungeon/core-valley-v202.webp', objective: 'Çekirdeği Koru', spawn: { x: 1200, y: 1050 } },
    { id: 'royal_court', name: 'Muhafızın Avlusu', image: '/dungeon/royal-court-v202.webp', objective: 'Bozulmuş Muhafız', spawn: { x: 1200, y: 1160 } },
]);
export function dungeonWalkable(x, y) { return Number.isFinite(x) && Number.isFinite(y) && x >= DUNGEON_WORLD.minX && x <= DUNGEON_WORLD.maxX && y >= DUNGEON_WORLD.minY && y <= DUNGEON_WORLD.maxY; }
export function dungeonCamera(x, y, width, height, coarse = false) {
    const scale = coarse ? .64 : .95;
    return { scale, x: Math.max(0, Math.min(DUNGEON_WORLD.width - width / scale, x - width / (2 * scale))), y: Math.max(0, Math.min(DUNGEON_WORLD.height - height / scale, y - height / (2 * scale))) };
}

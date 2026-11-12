// Owned ground loot keeps the existing integer-second clock and five-second
// collection delay. This flag changes its lifetime, never its reward contents.
export const groundLoot30s = process.env.CORE511_GROUND_LOOT_30S !== '0';
export const GROUND_LOOT_SECONDS = groundLoot30s ? 30 : 120;

export function groundLootExpired(expiresAt, nowSeconds) {
  return groundLoot30s ? expiresAt <= nowSeconds : expiresAt < nowSeconds;
}

export function groundLootDeadlineMs(expiresAt) {
  return (expiresAt + (groundLoot30s ? 0 : 1)) * 1000;
}

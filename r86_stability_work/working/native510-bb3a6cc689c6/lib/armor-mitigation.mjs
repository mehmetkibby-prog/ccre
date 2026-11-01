// Preserve every pre-cap defense value. Above the old cap, gear keeps a small,
// diminishing benefit; armor alone never grants immunity. Shared by HTTP,
// dungeon authority and the client HP-bar preview (which never applies damage).
export function armorDamageReduction(defense, mode = 'pvp') {
  const value = Number(defense);
  const safe = Number.isFinite(value) ? Math.max(0, value) : 0;
  const pve = mode === 'pve';
  const divisor = pve ? 100 : 250;
  const oldCap = pve ? .8 : .55;
  const extraCap = pve ? .02 : .05;
  const excess = Math.max(0, safe - divisor * oldCap);
  return Math.min(oldCap, safe / divisor) + extraCap * (excess / (excess + divisor));
}

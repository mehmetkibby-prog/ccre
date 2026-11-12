// working/core511-source/scripts/core511/armor-mitigation-r102.mjs
function armorDamageReduction(defense, mode = "pvp") {
  const value = Number(defense), safe = Number.isFinite(value) ? Math.max(0, value) : 0;
  const pve = mode === "pve", divisor = pve ? 100 : 250, knee = pve ? 0.8 : 0.55, excess = Math.max(0, safe - divisor * knee);
  const legacy = (pve ? 0.02 : 0.05) * excess / (excess + divisor);
  const growth = (pve ? 0.15 : 0.2) * excess / (excess + 1e3);
  return Math.min(knee, safe / divisor) + Math.max(legacy, growth);
}
export {
  armorDamageReduction
};

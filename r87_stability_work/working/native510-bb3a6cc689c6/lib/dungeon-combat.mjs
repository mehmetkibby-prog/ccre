// Private rooms use the same third-skill area rule as ordinary PvE: the
// selected enemy is the center, and the Guardian keeps its single-target leap.
// This scans only the caller's already loaded, bounded room enemies.
export function dungeonAttackTargets(enemies, target, role, skill) {
  if (skill !== 2 || role === 'muhafiz') return [target];
  return [target, ...enemies.filter(enemy => enemy !== target && enemy.hp > 0 && Math.hypot(enemy.x-target.x, enemy.y-target.y) <= 300)];
}

const percent = value => Math.max(0, Math.min(80, Number(value) || 0));
export function dungeonAttackDamage(stats, skill, target, critical, floor = 0) {
  const base = stats.attack * stats.multipliers[skill] * (critical ? stats.criticalMultiplier : 1);
  const direct = Math.max(1, Math.round(base));
  const multiplier = target.kind === 'focus' ? 1 : 1+(stats.monsterPower ?? 0)/100;
  // Fire and ice are immediate bonus damage, as in ordinary PvE. They do not
  // add status timers, periodic damage or slow effects. Both use the same
  // pre-PvE direct hit; neither amplifies the other.
  const elemental = ['fire','ice'].flatMap(kind => {
    const rate=percent(stats[kind]);
    return rate ? [{kind,damage:Math.max(1,Math.round(direct*rate/100))}] : [];
  });
  // Keep the previous dungeon direct-hit rounding exactly when no element is
  // equipped. The target multiplier applies to direct and elements together.
  const rolled=Math.max(1,Math.round((base+elemental.reduce((sum,e)=>sum+e.damage,0))*multiplier));
  const damage=Math.min(Math.max(0,target.hp-floor),rolled);
  return {damage,elemental:elemental.map(e=>({...e,damage:Math.max(1,Math.round(e.damage*multiplier))}))};
}

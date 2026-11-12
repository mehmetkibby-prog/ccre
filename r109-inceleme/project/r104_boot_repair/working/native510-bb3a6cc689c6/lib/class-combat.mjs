// One set of movement, reach and cadence rules for open maps and private maps.
export const ATTACK_ANIMATION_MS = Object.freeze([390, 680, 520]);
export const GUARDIAN_PULL_RANGE = 720;
export const GUARDIAN_DASH_RANGE = 600;
export function classMoveSpeed(role) { return (role === 'avci' ? 250 : 225) * 1.03 * 1.07; }
export function classAttackRange(role, skill = 0) {
  if (role === 'muhafiz') return skill === 1 ? GUARDIAN_PULL_RANGE : skill === 2 ? GUARDIAN_DASH_RANGE : 175;
  return role === 'avci' ? 470 : 440;
}
export function effectiveAttackCooldownMs(baseCooldownMs, attackSpeedPercent) {
  const base = Math.max(1, Math.round(Number(baseCooldownMs) || 1));
  const speed = Math.max(0, Math.min(80, Number(attackSpeedPercent) || 0));
  return Math.max(120, Math.round(base / (1 + speed / 100)));
}
export function effectiveSkillCooldown444(baseMs,speedPercent=0){const raw=Number(baseMs),base=Number.isFinite(raw)?Math.max(500,Math.round(raw)):10000;const speed=Number(speedPercent),safe=Number.isFinite(speed)?Math.max(0,Math.min(50,speed)):0;return Math.max(500,Math.round(base/(1+safe/100)));}
export function combatCadences(settings={},attackSpeedPercent=0,castSpeedPercent=0){return [effectiveAttackCooldownMs(650,attackSpeedPercent),effectiveSkillCooldown444(settings?.skill_two_cooldown_ms??10000,castSpeedPercent),effectiveSkillCooldown444(settings?.skill_three_cooldown_ms??12000,castSpeedPercent)];}
// Keyboard, joystick and click-to-walk produce the same normalized intent in every map.
export function mapMovementInput(keys, stick, position, target, speed, dt, stop = 8) {
  let x=stick.x+(keys.has('d')||keys.has('arrowright')?1:0)-(keys.has('a')||keys.has('arrowleft')?1:0);
  let y=stick.y+(keys.has('s')||keys.has('arrowdown')?1:0)-(keys.has('w')||keys.has('arrowup')?1:0);
  const manual=!!(x||y);
  let arrived=false;
  if(!manual&&target){
    const distance=Math.hypot(target.x-position.x,target.y-position.y);
    arrived=distance<=stop;
    const strength=Math.min(1,Math.max(0,distance-stop)/(speed*Math.max(.001,dt)));
    if(distance>0){x=(target.x-position.x)/distance*strength;y=(target.y-position.y)/distance*strength;}
  }
  const length=Math.max(1,Math.hypot(x,y));
  return {x:x/length,y:y/length,manual,arrived};
}

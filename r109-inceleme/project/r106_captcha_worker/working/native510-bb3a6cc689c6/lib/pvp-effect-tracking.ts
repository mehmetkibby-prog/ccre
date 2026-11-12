/** Presentation only: follow the same interpolated position used to draw heroes. */
export type PlayerEffectAnchor = { sourcePlayerId?: string; targetPlayerId?: string; anchorX?: number; anchorY?: number };
type Point = { x: number; y: number };
export function trackPlayerEffects(
  projectiles: Array<PlayerEffectAnchor & { tx: number; ty: number }>,
  effects: Array<PlayerEffectAnchor & Point>,
  resolve: (id: string) => Point | undefined,
) {
  for (const projectile of projectiles) {
    if (!projectile.targetPlayerId) continue;
    const point = resolve(projectile.targetPlayerId);
    if (!point) { projectile.targetPlayerId = undefined; continue; }
    projectile.tx = point.x;
    projectile.ty = point.y - 35;
    projectile.anchorX = point.x; projectile.anchorY = point.y;
  }
  for (const effect of effects) {
    trackPlayerEffect(effect, resolve);
  }
}

export function trackAdditionalPlayerEffects(
  effects: Array<PlayerEffectAnchor & Point>,
  resolve: (id: string) => Point | undefined,
) {
  for (const effect of effects) trackPlayerEffect(effect, resolve);
}

function trackPlayerEffect(effect: PlayerEffectAnchor & Point, resolve: (id: string) => Point | undefined) {
    if (!effect.targetPlayerId) return;
    const point = resolve(effect.targetPlayerId);
    if (!point) { effect.targetPlayerId = undefined; return; }
    effect.x += point.x - (effect.anchorX ?? point.x);
    effect.y += point.y - (effect.anchorY ?? point.y);
    effect.anchorX = point.x; effect.anchorY = point.y;
}

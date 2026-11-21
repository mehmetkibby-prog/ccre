import { Kind, Anim, EFlag } from '@col/shared';

/**
 * Canlanan oyuncu (sunucuda aynı varlık kalır, yeniden doğmaz): ölüm işareti burada silinir. Silinmezse başkalarının
 * ekranında yerde yatarak yürüyor, adı görünmüyor, tıklanamıyor ve hedef alınamıyordu. Döner: işaret silindi mi.
 */
export function clearReviveState(e: { kind: number; hp: number; flags: number; deadAt: number; anim: number; animStart: number }, now: number): boolean {
  if (!e.deadAt || e.kind !== Kind.PLAYER || e.hp <= 0 || (e.flags & EFlag.DEAD)) return false;
  e.deadAt = 0;
  if (e.anim === Anim.DEAD) { e.anim = Anim.IDLE; e.animStart = now; }
  return true;
}

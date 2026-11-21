import { describe, it, expect } from 'vitest';
import { CLASS_IDS, classSkill, BASIC_COOLDOWN_MS } from '@col/shared';
import { BASIC_HIT_S, BASIC_END_S, GUARDIAN_IMPACT_S, HUNTER_RELEASE_S, ARCANIST_RELEASE_S, basicTime, GUARDIAN_TRAIL_S, ARCANIST_TRAIL_S } from '../packages/client/src/g3d/charAnims.ts';
import { ATTACK_ANIM_MS } from '../packages/client/src/g3d/models.ts';
import { NATIVE_ATTACK } from '../packages/client/src/g3d/mocap.ts';

describe('düz vuruş hızı', () => {
  it('üç sınıfta bekleme süresi aynı', () => {
    for (const c of CLASS_IDS) expect(classSkill(c, 0)!.cooldownMs).toBe(BASIC_COOLDOWN_MS);
  });
  it('vuruş/atış anı ve animasyon süresi üç sınıfta aynı; animasyon bekleme süresine sığar', () => {
    expect(GUARDIAN_IMPACT_S).toBe(BASIC_HIT_S);
    expect(HUNTER_RELEASE_S).toBe(BASIC_HIT_S);
    expect(ARCANIST_RELEASE_S).toBe(BASIC_HIT_S);
    expect(ATTACK_ANIM_MS).toBe(Math.round(BASIC_END_S * 1000));
    expect(ATTACK_ANIM_MS).toBeLessThanOrEqual(BASIC_COOLDOWN_MS);
    for (const k of ['guardian', 'arcanist']) expect(NATIVE_ATTACK[k].hit).toBe(BASIC_HIT_S);
  });
  it('tasarım zamanı ortak ritme doğru çekilir (izler değme anını kapsar)', () => {
    for (const h of [0.19, 0.22]) {
      expect(basicTime(0, h)).toBe(0);
      expect(basicTime(h, h)).toBeCloseTo(BASIC_HIT_S, 6);
      expect(basicTime(0.62, h)).toBeCloseTo(BASIC_END_S, 6);
    }
    for (const [a, b] of [...GUARDIAN_TRAIL_S, ARCANIST_TRAIL_S]) { expect(a).toBeLessThan(BASIC_HIT_S); expect(b).toBeGreaterThan(BASIC_HIT_S); expect(b).toBeLessThan(BASIC_END_S); }
  });
});

import { describe, it, expect, afterEach } from 'vitest';
import { World, makeItem } from '../packages/server/src/worker/world.ts';
import type { CharState } from '../packages/server/src/types.ts';
import { applyTuning, DEFAULT_TUNING, MONSTERS, ITEM_TEMPLATES, getLayout, rebuildSpawns, monsterStats } from '@col/shared';
import { Monster } from '../packages/server/src/worker/entities.ts';

afterEach(() => { applyTuning(DEFAULT_TUNING); });
const wolf = MONSTERS.find((m) => m.id === 'shadow_wolf')!;
function char(over: Partial<CharState> = {}): CharState {
  const l = getLayout('forest');
  return { id: 1, accountId: 1, role: 'player', name: 'T', cls: 'guardian', level: 5, xp: 0, hp: 500, map: 'forest', x: l.spawn.x, y: l.spawn.y,
    gems: 0, essence: 0, cp: 0, arenaCoin: 0, stats: { str: 0, res: 0, vit: 0 }, skills: [1, 1, 1, 1], spec: null, kills: 0, bag: [], equip: {}, materials: {}, misc: {}, saveVersion: 1, ...over };
}

describe('yönetim ayarları oyunda işler', () => {
  it('canavara özel ganimet: her öldürmede yalnız Kızıl ekipman, sabit Mücevher', () => {
    applyTuning({ monsters: { shadow_wolf: { equipChance: 1, rarity: { crimson: 1 }, gems: [7, 7], mats: { red_potion: 0, kor_seal: 0, strong_branch: 0, white_pearl: 0 } } } });
    const w = new World({ channel: 1, aoiMaxPlayers: 48, saveIntervalMs: 15000, post: () => {} });
    w.join(1, char()); const p = w.bySid.get(1)!;
    const z = p.zone;
    for (let i = 0; i < 20; i++) {
      const m = new Monster(wolf, { monster: 'shadow_wolf', level: 5, variant: 0, x: p.x, y: p.y }); z.addMonster(m);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (w as any).rewardKill(p, m);
    }
    const items = [...z.lootById.values()].filter((l) => l.payload.kind === 'item');
    expect(items.length).toBe(20);
    expect(items.every((l) => l.payload.kind === 'item' && l.payload.item.rarity === 'crimson')).toBe(true);
    expect(p.char.gems).toBe(140);
  });

  it('efsun: sayı oranı, kapalı efsun ve kademe değerleri', () => {
    applyTuning({ enchants: { countWeights: { white: [0, 0, 0, 1] }, tierWeights: [0, 0, 0, 1], disabled: ['crit'], values: { hp: [1, 2, 3, 4444] } } });
    for (let i = 0; i < 300; i++) {
      const it = makeItem(ITEM_TEMPLATES[i % ITEM_TEMPLATES.length].id, 'white', 'drop');
      expect(it.ench.length).toBe(4);
      expect(it.ench.some((e) => e.t === 'crit')).toBe(false);
      for (const e of it.ench) { expect(e.tier).toBe(3); if (e.t === 'hp') expect(e.v).toBe(4444); }
    }
  });

  it('canavar türü çarpanları doğuşta uygulanır', () => {
    applyTuning({ monsters: { shadow_wolf: { hpMul: 3, atkMul: 2, defAdd: 10, xpMul: 0 } } });
    const s = monsterStats(wolf, 5, 0), m = new Monster(wolf, { monster: 'shadow_wolf', level: 5, variant: 0, x: 0, y: 0 });
    expect(m.maxHp).toBe(Math.round(s.maxHp * 3)); expect(m.atk).toBe(Math.round(s.atk * 2)); expect(m.armor).toBe(s.def + 10); expect(m.xp).toBe(0);
  });

  it('doğma grubu sayısı haritayı değiştirir; 0 grubu kaldırır', () => {
    const l = getLayout('forest');
    applyTuning({ spawns: { 'forest:0': { count: 0 }, 'forest:2': { count: 45, level: [20, 22] } } });
    rebuildSpawns(l);
    const guards = l.spawnPoints.filter((s) => s.monster === 'rot_guard' && s.level >= 20);
    expect(guards.length).toBeGreaterThan(30);
    expect(l.spawnPoints.filter((s) => s.monster === 'shadow_wolf' && s.level < 6).length).toBe(0);
    applyTuning(DEFAULT_TUNING); rebuildSpawns(l);
  });

  it('yönetici bir oyuncunun seviyesini değiştirir (istatistikler yeniden hesaplanır)', () => {
    const w = new World({ channel: 1, aoiMaxPlayers: 48, saveIntervalMs: 15000, post: () => {} });
    w.join(1, char()); const p = w.bySid.get(1)!;
    const hp0 = p.stats.maxHp;
    expect(w.adminSetPlayer(1, { level: 40, gems: 999 })).toBe(true);
    expect(p.char.level).toBe(40); expect(p.char.gems).toBe(999); expect(p.stats.maxHp).toBeGreaterThan(hp0); expect(p.hp).toBe(p.stats.maxHp);
  });
});

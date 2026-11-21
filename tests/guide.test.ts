import { describe, it, expect, afterEach } from 'vitest';
import { applyTuning, MAPS, TUNING } from '@col/shared';
import { roadmap, recommendedStop, milestones, monsterLoot, materialSources, pctTxt, powerAdvice, type PowerSelf } from '../packages/client/src/ui/guideData.ts';

// Rehber: bütün sayılar yönetim ayarından (TUNING) gelir; ayar değişince rehber de değişir.
afterEach(() => { applyTuning({}); });

describe('Rehber verisi', () => {
  it('yol haritası: ışınlanılabilen av bölgeleri giriş seviyesine göre sıralı', () => {
    const r = roadmap();
    expect(r.length).toBeGreaterThanOrEqual(4);
    expect(r[0].map.id).toBe('bazaar');
    for (let i = 1; i < r.length; i++) expect(r[i].minLevel).toBeGreaterThanOrEqual(r[i - 1].minLevel);
    for (const s of r) { expect(s.map.travelable).toBe(true); expect(s.monsters.length).toBeGreaterThan(0); }
    // Tilki Kral Pazar Köyü'nün bossu; Kara Taş Muhafızı Kara Bölge'nin
    expect(r.find((s) => s.map.id === 'bazaar')!.bosses.map((b) => b.id)).toContain('fox_king');
    expect(r.find((s) => s.map.id === 'black')!.bosses.map((b) => b.id)).toContain('black_stone');
    // seviye aralığı bir sonraki bölgenin girişine kadar
    expect(r[0].maxLevel).toBe(r[1].minLevel - 1);
    expect(r[r.length - 1].maxLevel).toBeNull();
  });

  it('önerilen bölge oyuncunun seviyesine göre', () => {
    const r = roadmap();
    expect(recommendedStop(r, 1)).toBe('bazaar');
    expect(recommendedStop(r, MAPS.forest.minLevel)).toBe('forest');
    expect(recommendedStop(r, MAPS.frozen.minLevel + 1)).toBe('frozen');
    expect(recommendedStop(r, undefined)).toBeNull();
  });

  it('yönetim ayarı rehbere yansır (canavar seviyesi, zindan girişi, kapatılan doğma grubu)', () => {
    applyTuning({ monsters: { shadow_wolf: { level: 11 } }, tower: { minLevel: 33 }, spawns: { 'forest:2': { count: 0 } } });
    const forest = roadmap().find((s) => s.map.id === 'forest')!;
    expect(forest.monsters.find((m) => m.id === 'shadow_wolf')!.level).toBe(11);
    expect(forest.monsters.some((m) => m.id === 'rot_guard')).toBe(true); // rot_guard başka grupta da var
    expect(milestones(20).some((m) => m.level === 33 && m.text.includes('Kadim Kule'))).toBe(true);
    expect(TUNING.tower.minLevel).toBe(33);
  });

  it('düşme listesi: hedef çerçevesindeki "?" ile aynı kurallar', () => {
    expect(monsterLoot('forge', 'f_boss').drops[0].key).toBe('forge_chest');
    expect(monsterLoot('tower', 'azrail', { floor: 10 }).drops.some((d) => d.key === 'azrail_chest')).toBe(true);
    // Ustalık Mührü canavardan düşmez (sunucudaki kural); yönetim eklese de listede görünmez
    applyTuning({ zoneLoot: { forest: { mats: { mastery_seal: 0.5 } } } });
    expect(monsterLoot('forest', 'shadow_wolf').materials.some((m) => m.id === 'mastery_seal')).toBe(false);
  });

  it('malzeme kaynakları: artı basma malzemeleri nereden çıktığıyla', () => {
    const src = materialSources();
    const kor = src.find((s) => s.id === 'kor_seal')!;
    expect(kor.uses).toContain('Artı basma');
    expect(kor.from.length).toBeGreaterThan(0);
    expect(src.find((s) => s.id === 'ember_stone')!.from.some((f) => f.where === 'Kor Kulesi')).toBe(true);
  });

  it('yüzde yazımı', () => {
    expect(pctTxt(0.5)).toBe('%50');
    expect(pctTxt(0.035)).toBe('%3,5');
    expect(pctTxt(0.004)).toBe('%0,40');
  });

  it('Gücünü Artır: sitede genel liste, oyunda kişiye özel öneriler', () => {
    const generic = powerAdvice();
    expect(generic.length).toBeGreaterThanOrEqual(8);
    expect(generic.some((t) => t.hot)).toBe(false);
    const self: PowerSelf = {
      level: 20, statBudget: 57, statAlloc: { str: 10, res: 5, vit: 0 }, skills: [1, 1, 1, 0, 1, 1], skillBudget: 20,
      equip: { weapon: { id: 'w', tpl: 'w_guardian', rarity: 'blue', plus: 2, ench: [], kills: 120 } }, buffs: {},
    };
    const tips = powerAdvice(self);
    const stat = tips.find((t) => t.id === 'stat')!;
    expect(stat.hot).toBe(true);
    expect(stat.title).toContain('42'); // 57 - 15 boştaki puan
    expect(tips.find((t) => t.id === 'plus-weapon')!.title).toContain('+3');
    // seviye 20: Turuncu silah kuşanılabilir, mavi silah taşıyan oyuncuya önerilir
    expect(tips.some((t) => t.id.startsWith('rar-'))).toBe(true);
    // yönetim artı şansını değiştirince öneri de değişir
    applyTuning({ upgrade: { steps: [1, 2, 3, 4, 5, 6].map((i) => ({ chance: i === 3 ? 42 : 50, gems: 100, mats: {}, weapon: i * 5, armor: i * 4 })), flat: true } });
    expect(powerAdvice(self).find((t) => t.id === 'plus-weapon')!.how).toContain('%42');
  });
});

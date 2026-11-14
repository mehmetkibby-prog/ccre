/**
 * Nesne Market: ÇP (Çekirdek Puanı) ile alınan ürünler. Satın alınan ürün çantanın "Nesne Market" bölümüne
 * gelir (malzeme gibi yığılır); süreli olanlar çantadan "Kullan" denince başlar, tekrar kullanınca süre uzar.
 * Fiyat, satış durumu ve kanat değerleri yönetim panelinden değişir (TUNING.mall).
 */
import { TUNING } from '../tuning.ts';

export type MallCat = 'guc' | 'iksir' | 'gelistirme' | 'kullanim' | 'balik' | 'gorunum' | 'cp' | 'paket' | 'yakinda';
export const MALL_CATS: [MallCat, string][] = [
  ['guc', 'Güçlendirme'], ['iksir', 'Oto İksir'], ['gelistirme', 'Eşya Geliştirme'], ['kullanim', 'Kullanışlı'],
  ['balik', 'Balıkçılık'], ['gorunum', 'Görünüm'], ['paket', 'Paketler'], ['cp', 'ÇP ve E-PIN'], ['yakinda', 'Yakında'],
];
const H = 3600_000, D = 24 * H;
export interface MallItem {
  id: string; no: number; name: string; desc: string; cat: MallCat; price: number;
  /** süreli etki: anahtar ve süre (ms); aynı anahtar tekrar kullanılınca süre eklenir */
  buff?: { key: string; ms: number };
  /** kullanılınca bir ekipman seçilir */
  target?: 'equip';
  /** satılmaz (sistemi henüz oyunda yok) */
  soon?: boolean;
  /** E-PIN paketi: ÇP ile satılmaz, kodla yüklenir */
  epin?: number;
}
export const MALL_ITEMS: MallItem[] = [
  { no: 1, id: 'xp_ring', name: 'Tecrübe Yüzüğü', cat: 'guc', price: 120, buff: { key: 'xp_ring', ms: 5 * D }, desc: '5 gün boyunca canavar ve bosslardan kazanılan tecrübeyi %25 artırır.' },
  { no: 2, id: 'loot_charm', name: 'Ganimet Tılsımı', cat: 'guc', price: 120, buff: { key: 'loot_charm', ms: 5 * D }, desc: '5 gün boyunca ekipman düşme şansını %25 artırır. Diğer ödülleri ve eşya miktarını artırmaz.' },
  { no: 3, id: 'essence_charm', name: 'Öz Toplayıcı Tılsım', cat: 'guc', price: 60, buff: { key: 'essence_charm', ms: 3 * D }, desc: '3 gün boyunca canavarlardan kazanılan Yaşam Özünü %20 artırır. Sandık, bağış ve ticaretten gelen öze uygulanmaz.' },
  { no: 4, id: 'wisdom_scroll', name: 'Kadim Bilgelik Parşömeni', cat: 'guc', price: 50, buff: { key: 'wisdom_scroll', ms: 2 * H }, desc: '2 saat boyunca %25 fazla tecrübe kazandırır (Tecrübe Yüzüğü ile birlikte işler).' },
  { no: 5, id: 'war_ration', name: 'Savaşçının Kumanyası', cat: 'guc', price: 25, buff: { key: 'war_ration', ms: 1 * H }, desc: '60 dakika boyunca +15 saldırı ve +200 can verir. Ölümde kaybolmaz; etkinken yeniden kullanılamaz.' },
  { no: 6, id: 'crimson_wings', name: 'Kızıl Çekirdek Kanatları', cat: 'guc', price: 250, buff: { key: 'crimson_wings', ms: 7 * D }, desc: '7 günlük kanat. Saldırı, savunma ve kritik şansı verir (varsayılan +30 saldırı, +50 savunma, %15 kritik).' },
  { no: 26, id: 'pet_bird', name: 'Işık Kanadı - Kuş Peti', cat: 'guc', price: 150, buff: { key: 'pet_bird', ms: 7 * D }, desc: '7 günlük yardımcı pet. Aktifken +20 saldırı ve %10 tecrübe bonusu verir. Aynı anda bir pet etkin olur.' },
  { no: 27, id: 'pet_monkey', name: 'Minik Usta - Maymun Peti', cat: 'guc', price: 150, buff: { key: 'pet_monkey', ms: 7 * D }, desc: '7 günlük yardımcı pet. Aktifken +20 saldırı ve %10 tecrübe bonusu verir. Aynı anda bir pet etkin olur.' },
  { no: 28, id: 'pet_dog', name: 'Orman Bekçisi - Köpek Peti', cat: 'guc', price: 150, buff: { key: 'pet_dog', ms: 7 * D }, desc: '7 günlük yardımcı pet. Aktifken %20 tecrübe bonusu verir; saldırı bonusu yoktur. Aynı anda bir pet etkin olur.' },
  { no: 7, id: 'auto_potion', name: 'Oto Kırmızı İksir', cat: 'iksir', price: 80, desc: 'Can %50 veya altına düşünce otomatik iyileştirir. 1.000.000 canlık deposu vardır; kullanıldıkça tükenir. En sık 2 saniyede bir çalışır. Çantadaki normal iksirleri tüketmez.' },
  { no: 8, id: 'auto_potion_big', name: 'Büyük Oto Kırmızı İksir', cat: 'iksir', price: 600, desc: 'Otomatik can yenilemenin 10.000.000 can kapasiteli çeşididir. Kullanıldıkça deposu azalır.' },
  { no: 11, id: 'enchant_add', name: 'Efsun Artırma Nesnesi', cat: 'gelistirme', price: 90, target: 'equip', desc: 'Seçtiğin ekipmana yeni rastgele bir efsun ekler. Efsunları 4 adede kadar tamamlar.' },
  { no: 12, id: 'enchant_change', name: 'Efsun Değiştirme Parşömeni', cat: 'gelistirme', price: 40, target: 'equip', desc: 'Ekipmandaki efsunların türlerini ve değerlerini yeniden belirler. Efsun sayısını artırmaz.' },
  { no: 13, id: 'mastery_seal', name: 'Ustalık Mührü', cat: 'gelistirme', price: 35, desc: 'Haso\'da bir artı basma denemesinin başarı ihtimalini 1,3 katına çıkarır (örn. %20 → %26, en fazla %100). Denemede tüketilir; artı düşmesini engellemez.' },
  { no: 14, id: 'protect_seal', name: 'Demircinin Koruma Mührü', cat: 'gelistirme', price: 30, desc: 'Sonraki başarısız artı basmada harcanan her malzemenin yarısını (aşağı yuvarlayarak) geri verir. Başarılı denemede tüketilmez.' },
  { no: 15, id: 'spec_reset', name: 'Uzmanlık Sıfırlama Parşömeni', cat: 'kullanim', price: 150, desc: 'Seçilen uzmanlığı sıfırlar; başka uzmanlık seçebilirsin. Seviye, eşyalar ve beceri seviyeleri korunur. Savaş dışında kullanılır.' },
  { no: 18, id: 'boss_tracker', name: 'Boss Takip', cat: 'kullanim', price: 100, buff: { key: 'boss_tracker', ms: 7 * D }, desc: '7 gün boyunca bütün bossların yerini, durumunu ve yeniden doğma sürelerini gösterir. Çevrimdışıyken de süre azalır.' },
  { no: 19, id: 'trade_glass', name: 'Ticaret Camı', cat: 'kullanim', price: 50, buff: { key: 'trade_glass', ms: 3 * D }, desc: '3 gün boyunca Pazar Köyü\'ndeki bütün satış ilanlarında arama yapmanı sağlar.' },
  { no: 20, id: 'item_reflect', name: 'Eşya Yansıtma', cat: 'kullanim', price: 5, target: 'equip', desc: 'Ekipmanının özelliklerini sohbette paylaşır. Başarılı paylaşımda 1 adet tüketilir; diğerleri ücretsiz görüntüler.' },
  { no: 22, id: 'rename', name: 'İsim Değiştirme', cat: 'kullanim', price: 200, desc: 'Karakterinin adını değiştirir. Eşyaların ve ilerlemen korunur.' },
  { no: 16, id: 'fish_guide', name: 'Balıkçılık Kılavuzu', cat: 'balik', price: 30, buff: { key: 'fish_guide', ms: 1 * H }, desc: '1 saat boyunca tutulan balık ve incileri ikiye katlar. Bereketli Olta Yemi ile birlikte en fazla iki kat olur.' },
  { no: 17, id: 'fish_bait', name: 'Bereketli Olta Yemi', cat: 'balik', price: 20, desc: 'Sonraki 30 başarılı avda balık miktarını ikiye katlar. İncileri çoğaltmaz; inci yem hakkı tüketmez.' },
  { no: 29, id: 'emerald_stall', name: 'Zümrüt Pazar Tezgâhı', cat: 'gorunum', price: 300, desc: 'Açtığın pazara kalıcı zümrüt tezgâh görünümü verir. Ürünleri ve satış koşullarını değiştirmez; görünüm açılıp kapatılabilir.' },
  { no: 30, id: 'emerald_gate', name: 'Zümrüt Geçidi', cat: 'gorunum', price: 120, buff: { key: 'emerald_gate', ms: 7 * D }, desc: '7 gün boyunca harita değiştirirken çevrende zümrüt mühür ve ışık efekti oluşur.' },
  { no: 36, id: 'support_pack', name: 'Destek Paketi', cat: 'paket', price: 420, desc: 'Tecrübe Yüzüğü, Ganimet Tılsımı ve Kızıl Çekirdek Kanatlarını birlikte verir (ayrı ayrı almaktan ucuz).' },
  { no: 23, id: 'cp_100', name: '100 ÇP Kuponu', cat: 'cp', price: 100, desc: 'Kullanıldığında 100 ÇP verir. Eşya olarak başka oyuncuya satılabilir.' },
  { no: 24, id: 'cp_200', name: '200 ÇP Kuponu', cat: 'cp', price: 200, desc: 'Kullanıldığında 200 ÇP verir. Eşya olarak başka oyuncuya satılabilir.' },
  { no: 25, id: 'cp_500', name: '500 ÇP Kuponu', cat: 'cp', price: 500, desc: 'Kullanıldığında 500 ÇP verir. Eşya olarak başka oyuncuya satılabilir.' },
  { no: 32, id: 'epin_200', name: '200 ÇP E-PIN', cat: 'cp', price: 0, epin: 200, desc: 'Kodla 200 ÇP yükler. Kodu marketteki "E-PIN Kullan" kutusuna yaz.' },
  { no: 33, id: 'epin_500', name: '500 ÇP E-PIN', cat: 'cp', price: 0, epin: 500, desc: 'Kodla 500 ÇP yükler.' },
  { no: 34, id: 'epin_1000', name: '1000 ÇP E-PIN', cat: 'cp', price: 0, epin: 1000, desc: 'Kodla 1.000 ÇP yükler.' },
  { no: 35, id: 'epin_3000', name: '3000 ÇP E-PIN', cat: 'cp', price: 0, epin: 3000, desc: 'Kodla 3.000 ÇP yükler.' },
  { no: 9, id: 'afk_ticket', name: 'Ekstra 3 Saat Oto Atak Bileti', cat: 'yakinda', price: 0, soon: true, desc: 'Oto atak sistemi oyuna eklenince satışa çıkacak.' },
  { no: 10, id: 'afk_island', name: 'Oto Av +2 Saat Bileti', cat: 'yakinda', price: 0, soon: true, desc: 'Oto Av Adası açılınca satışa çıkacak.' },
  { no: 21, id: 'storage_page', name: 'Ek Depo Sayfası', cat: 'yakinda', price: 0, soon: true, desc: 'Depocu Rauf\'un deposu açılınca satışa çıkacak (24 ek bölme).' },
  { no: 31, id: 'battle_pass', name: 'Premium Savaş Bileti', cat: 'yakinda', price: 0, soon: true, desc: 'Sezon sistemi açılınca satışa çıkacak.' },
];
export const MALL = new Map(MALL_ITEMS.map((m) => [m.id, m] as const));
export const PET_KEYS = ['pet_bird', 'pet_monkey', 'pet_dog'] as const;
export const AUTO_POOL: Record<string, number> = { auto_potion: 1_000_000, auto_potion_big: 10_000_000 };
export const CP_COUPON: Record<string, number> = { cp_100: 100, cp_200: 200, cp_500: 500 };
export const SUPPORT_PACK = ['xp_ring', 'loot_charm', 'crimson_wings'];
export const DEFAULT_WINGS = { atk: 30, def: 50, crit: 15 };
export function mallIcon(id: string) { return 'mall_' + (id === 'support_pack' ? 'xp_ring' : id); }
export function mallPrice(id: string) { return Math.max(0, Math.round(TUNING.mall?.price?.[id] ?? MALL.get(id)?.price ?? 0)); }
/** Satışta mı: E-PIN ve "yakında" ürünler ÇP ile satılmaz; yönetim kapattıysa da satılmaz. */
export function mallForSale(id: string) { const m = MALL.get(id); return !!m && !m.soon && !m.epin && mallPrice(id) > 0 && !(TUNING.mall?.off ?? []).includes(id); }
export function wingsBonus() { const w = TUNING.mall?.wings ?? {}; return { atk: w.atk ?? DEFAULT_WINGS.atk, def: w.def ?? DEFAULT_WINGS.def, crit: w.crit ?? DEFAULT_WINGS.crit }; }

/** Etkin süreli etkiler → savaş ve ödül bonusları (sunucu ve istemci aynı hesabı kullanır). */
export interface CharBuffs { atkFlat: number; hpFlat: number; defFlat: number; critPct: number; xpPct: number; dropPct: number; essPct: number }
export function charBuffs(buffs: Record<string, number> | undefined, now: number): CharBuffs {
  const b: CharBuffs = { atkFlat: 0, hpFlat: 0, defFlat: 0, critPct: 0, xpPct: 0, dropPct: 0, essPct: 0 };
  if (!buffs) return b;
  const on = (k: string) => (buffs[k] ?? 0) > now;
  if (on('xp_ring')) b.xpPct += 25;
  if (on('wisdom_scroll')) b.xpPct += 25;
  if (on('loot_charm')) b.dropPct += 25;
  if (on('essence_charm')) b.essPct += 20;
  if (on('war_ration')) { b.atkFlat += 15; b.hpFlat += 200; }
  if (on('crimson_wings')) { const w = wingsBonus(); b.atkFlat += w.atk; b.defFlat += w.def; b.critPct += w.crit; }
  if (on('pet_bird') || on('pet_monkey')) { b.atkFlat += 20; b.xpPct += 10; }
  if (on('pet_dog')) b.xpPct += 20;
  return b;
}

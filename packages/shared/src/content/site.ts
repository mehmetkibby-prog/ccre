/**
 * Site içeriği (sunucu ve istemci aynı tanımı kullanır): forum bölümleri, ön kayıt ödülü, iletişim.
 */
export const SITE = {
  company: 'ŞahPlay',
  supportEmail: 'destek@coreoflife.net',
  gameName: 'Core of Life 3D',
} as const;

/** Ön kayıt ödülü: Ön Kayıt Sandığı (hesap başına bir kez, ilk karaktere). */
export const PREREG_REWARD = { gems: 15, pet: 'pet_fox', petAtk: 10, petHp: 200 } as const;

export interface ForumCat { id: string; name: string; desc: string; /** yalnız yönetim konu açar (oyuncular yanıtlayabilir) */ staffOnly: boolean }
export const FORUM_CATS: ForumCat[] = [
  { id: 'duyurular', name: 'Duyurular', desc: 'Yönetimden haberler, güncelleme notları ve etkinlikler.', staffOnly: true },
  { id: 'genel', name: 'Genel Sohbet', desc: 'Oyun, topluluk ve maceralarınız hakkında her şey.', staffOnly: false },
  { id: 'rehber', name: 'Rehberler ve Taktikler', desc: 'Sınıf kurulumları, zindan taktikleri, artı basma deneyimleri.', staffOnly: false },
  { id: 'oneri', name: 'Öneri ve İstekler', desc: 'Oyunu birlikte geliştirelim: fikirlerinizi yazın.', staffOnly: false },
  { id: 'hata', name: 'Hata Bildirimi', desc: 'Karşılaştığınız hataları adım adım anlatın; ekip inceler.', staffOnly: false },
  { id: 'ticaret', name: 'Ticaret', desc: 'Eşya alım satım ilanları (dolandırıcılığa karşı dikkatli olun).', staffOnly: false },
];
export const FORUM_CAT = new Map(FORUM_CATS.map((c) => [c.id, c] as const));
export const FORUM_LIMITS = { titleMin: 4, titleMax: 90, bodyMin: 2, bodyMax: 8000, topicsPerPage: 20, postsPerPage: 15, editMinutes: 60 } as const;

/** Forum metni: denetim karakterleri atılır, satır sonları korunur, art arda en çok iki boş satır. */
export function cleanForumText(s: unknown, max: number): string {
  return String(s ?? '')
    .replace(/\r\n?/g, '\n')
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f​-‏‪-‮⁦-⁩]/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{4,}/g, '\n\n\n')
    .trim()
    .slice(0, max);
}
/** Başlık: tek satır, fazla boşluk sıkıştırılır. */
export function cleanForumTitle(s: unknown): string {
  return cleanForumText(s, 200).replace(/\s+/g, ' ').trim().slice(0, FORUM_LIMITS.titleMax);
}
/** E-posta biçimi (kayıtta zorunlu). */
export function validEmail(s: string): boolean {
  return s.length <= 120 && /^[^@\s"'<>]+@[^@\s"'<>]+\.[^@\s"'<>]{2,}$/.test(s);
}

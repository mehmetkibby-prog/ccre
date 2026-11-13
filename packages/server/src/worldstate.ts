/**
 * Eski "Dünya Çekirdeği" sisteminden kalan yer tutucu: sistem kaldırıldı (sağlık sabit, bağış yok).
 * Protokol ve kanal mesajları uyum için `health` alanını taşımaya devam eder.
 */
export class WorldState {
  readonly health = 100;
  async load() { /* kalıcı durum yok */ }
}

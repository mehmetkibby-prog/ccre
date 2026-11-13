# R113 devam notu — 13 Kasım 2026

Son doğrulanan canlı sürüm **R110_HANDOFF1**. Bu çalışma canlıya kurulmadı.
Dal `codex/r113-engine-rework`; aktif kod
`project/r109_latency_completion/working`. Son oyun kodu değişikliği `8caf54d`;
çekirdek kimliği `41fb08d699eafa8d8e0f3a1da64b2d8c465f7fc7fce4b1b90f4d71569972ce94`.

- Sürümlemeli kayıt sonuçları ve denetlenen savaş değişiklikleri, harita/bağımsız
  kule işlem sıraları, tek kalıcı yazıcı, bağımsız arayüz okuma/sohbet yolu eklendi.
- Toplu iksirler kendi mevcut atomik ve korumalı yolunda kalır. Dünya geçişi
  sırasında sohbet, kilit kalkınca yeniden yetkilendirilir; gönderim tekrarlanmaz.
- Kanonik `dunya-bosu-1` ölümü ve ödül talebi aynı dünya kilidiyle ayrı yazıcıda
  yürür. Diğer desteklenmeyen durumlar mevcut yola döner. COMMIT, RNG, ödül,
  sahiplik ve makbuz denetimleri kaldırılmadı. Gerçek yazıcı kapanması hem kayıt
  öncesi hem sonrası sınandı; tekrar eden istek ikinci ödül üretmiyor.
- Kullanıcı artık **yalnızca 50 oyunculu yük testi** istiyor. Eski
  10/30/40/100 kayıtları tarihsel. Akademi'nin gerçek 40 kişilik giriş sınırı
  kaldırılmadı; 50 kişilik yük Efsane üzerinde. Akademi ayrıca kurulum ve
  tarayıcı senaryolarıyla doğrulanıyor.

Son altı 50 kişilik koşu (üç karma, üç ortak boss) işlevsel olarak geçti.
Üç karma koşunun ortancası R110 → R113: ölüm iletimi p99 471,9 → 234,2 ms,
döngü p99 31,6 → 22,1 ms, ana ELU %40,2 → %30,6. 50 ms üstü ana süreç
duraklaması ortancası 3 → 3/dakika; yeni koşular 3/4/1. Dolayısıyla tüm
koşullarda en fazla 1/dakika veya sıfır takılma hedefi sağlanmış DEĞİLDİR.
Testler sentetik veride, dört CPU kotasıyla çalıştı; canlı kapasite garantisi yok.
Ham olumsuz sonuçlar silinmedi. Özet: `project/r113_engine/evidence/final-50-summary.json`.

Güncel ZIP ve SHA256: `project/r113_engine/evidence/package.json`.
`R113_ENGINE_76cd8cd4c40f.zip` dışındaki eski R113 adaylarını teslim etme.
Özellikle `aab319972d6d` iksir hatası nedeniyle reddedildi. Eski ZIP/SHA değişmez.
Kurucu yalnız doğrulanmış R110 kaynağını kabul eder; iki türetilmiş tabloyu
kontrollü ekler, geri dönüşte oyuncu ilerlemesini eski yedekle değiştirmez.
Kurulum ve gerçek iki sunucu açılışı bu ZIP ile geçti; son kontrol kayıtları
`validation/r113-engine/boss-final-*`. Ayrıntılı zaman çizelgesi:
`project/r113_engine/WORK_STATE.md`.

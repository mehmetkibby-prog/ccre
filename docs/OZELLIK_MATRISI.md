# Özellik Matrisi

Bölüm numaraları yapım promptuyla eşleşir.
Durum: ✅ çalışıyor (UI + sunucu + kalıcı) · 🟡 kısmi · ⬜ henüz yok.

| # | Bölüm | Durum | Not |
|---|---|---|---|
| 1 | Görsel dil, 3B dünya, HUD | 🟡 | 3B izometrik motor, prosedürel modeller/dokular, gölge, sis, parıltı, GTAO, kalite profilleri. Görsel cila devam ediyor. |
| 2 | Hesap, karakter, kanal girişi | 🟡 | Kayıt/giriş/çıkış/parola sıfırlama (geliştirme kodu), 2–18 ad + Türkçe normalizasyon, 3 sınıf, kanal kartları, tek bekleyen giriş, nonce, Başlangıç Sandığı makbuzu, açılış durumları (API). Yok: e-posta servisi, realm seçimi, erken erişim UI. |
| 3 | Haritalar ve erişim | 🟡 | Pazar Köyü, Kuzey Ormanı, Donmuş Geçit, Kara Bölge, Şelale Gölü. Sunucu seviye/savaş/PvP onayı doğrular. Diğer 15 harita yok. |
| 4 | Hareket, savaş, yeniden doğuş | ✅ | WASD/fare/joystick, istemci tahmini + uzlaştırma, interpolasyon, 3 sınıf × 3 beceri + 6 uzmanlık becerisi, kök/sersemletme/çekme/atılma/alan/iyileştirme/kalkan, aggro/leash/regen, boss tehlike alanları (daire/halka/çizgi), ölüm durum makinesi, iksir + oto iksir. |
| 5 | Seviye, statü, uzmanlık, rütbe | 🟡 | Seviye 1–50, TP eğrisi, statü taslak/uygula (revizyon kontrollü), beceri geliştirme 1–10, uzmanlık seçimi + güç geliştirme. Yok: rütbe, 65 genişleme, sıfırlama parşömeni. |
| 6 | Ekipman, nadirlik, ganimet | 🟡 | 7 yuva, 8 nadirlik, efsunlar, kişisel ganimet (30 sn / 5 sn / 280 birim), ölüm makbuzu. Yok: set bonusları, kemer/kostüm/kanat/rün yuvaları, sandık tabloları. |
| 7 | Haso: artı basma | 🟡 | +0→+5 tablo, Ustalık Mührü (göreli %30), düşme kuralı, beklenen artı doğrulaması. Yok: evrim, nadirlik dönüşümü. |
| 8–9 | Efsun işlemleri, taş, tılsım, takı, kemer, rün | ⬜ | Efsun verisi var; işlemler yok. |
| 10 | Çanta, depo, banka, satış | 🟡 | Çanta 35, kilit, toplu satış ön izlemesi, NPC mağazası (fiyat değişti kontrolü). Yok: depo, banka, Öz takası. |
| 11 | Tezgâh, Ticaret Camı, takas | ⬜ | |
| 12 | Pet, kanat, kostüm | ⬜ | |
| 13 | Nesne Market, ÇP, ödeme, E-PIN | ⬜ | ÇP bakiyesi alanı var. |
| 14 | Çark, sandıklar, kazan | ⬜ | Başlangıç Sandığı açma çalışıyor. |
| 15–18 | Lonca, şato, lonca savaşı, kale | ⬜ | |
| 19 | Grup, arena, açık PvP | 🟡 | Kara Bölge açık PvP + %5 Mücevher kuralı + giriş onayı. Grup/arena yok. |
| 20–22 | Zindanlar, Kadim Kulesi, Sis Yarığı | ⬜ | Boss tehlike alanı altyapısı hazır. |
| 23 | Binek | ⬜ | |
| 24 | Balıkçılık | ⬜ | Göl haritası ve Balıkçı Hasan var. |
| 25 | Görevler, rehber, savaş bileti | ⬜ | |
| 26 | Etkinlikler | ⬜ | |
| 27 | Dünya Sağlığı | 🟡 | Ortak gösterge, zamanla azalma, bağış formülü (sunucu). Bağış UI ve periyodik ödül yok. |
| 28 | Sohbet, arkadaş, sıralama | 🟡 | Dünya/Ticaret (5 sn) ve Bölge sohbeti, hız sınırı, 140 karakter. Yok: özel mesaj, arkadaş, sıralamalar. |
| 29 | Oto av, AFK doğrulama, moderasyon | ⬜ | Ban alanları var. |
| 30 | 38 bölüm yönetim paneli | ⬜ | Yalnız API: metrikler, açılış durumu (revizyon çakışma kontrollü). |
| 31 | Ayarlar, ses, performans | 🟡 | Kalite, yakınlaştırma, müzik/efekt ayrı, isimler, tam ekran, FPS/ping göstergesi, prosedürel ses. Mobil düğme taşıma yok. |
| 32 | Sunucu, veri modeli, tutarlılık | 🟡 | Otoriter sunucu, kanal izolasyonu, ikili delta, AOI, geri basınç, save_version, makbuzlar, UUID eşya. İki karakter arası atomik aktarım henüz gerekmedi (takas yok). |
| 33 | VDS kurulumu | ✅ | systemd, nginx (WS), env, yedek/geri dönüş, sağlık. |
| 34 | Kabul/yük testleri | 🟡 | Gerçek protokol botları + rapor (bkz. TEST_RAPORU.md). Birim testleri sınırlı. |

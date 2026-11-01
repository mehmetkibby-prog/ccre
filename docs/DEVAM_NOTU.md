# Devam Notu

## Son çalışan durum (31 Ekim 2026)
- Tam akış oynanabilir: hesap → karakter (3 sınıf, 3B önizleme) → kanal → 3B dünya (Pazar Köyü, Kuzey Ormanı, Donmuş Geçit, Kara Bölge, Şelale Gölü) → hareket → savaş/beceriler → ganimet → seviye/statü/beceri → artı basma → alım/satım → ölüm/dirilme → kalıcı kayıt.
- Sunucu altyapısı: 6 kanal worker, AOI, ikili delta, geri basınç, write-behind kalıcılık, hile/dupe korumaları, 600 bot yük testi geçti.
- Görsel: Three.js 3B motor; prosedürel dokular (çimen, toprak, arnavut kaldırımı vb.), iskeletli karakterler ve canavarlar, gölge, GTAO, parıltı, rüzgârlı çimen, su, görüş deliği.

## Sıradaki somut işler (öncelik sırasıyla)
1. **Gerçekçi karakter modelleri:** Meshy → Mixamo dosyaları gelince `node scripts/import-characters.mjs` (bkz. docs/KARAKTER_MODELLERI.md). Hat örnek gerçekçi modellerle test edildi (FBX+GLB, ortak animasyon, yön, üçgen azaltma).
   **Görsel cila:** kurt/golem modelleri, ağaç kartlarının ölçeği, köyde zemin çeşitliliği, gece/gündüz ışığı, ses ve müzik.
2. **Ekonomi çekirdeği:** depo (Rauf) + Mücevher bankası; iki karakter arası atomik aktarım altyapısı (takas → pazar tezgâhı → Ticaret Camı).
3. **Grup sistemi** (5 kişi, TP bonusu) ve **görev zinciri + ilk adım rehberi**.
4. **Haso:** silah evrimi, nadirlik dönüşümü, efsun işlemleri, taş/tılsım.
5. **Zindanlar:** solo Paslı Mahzen → grup Çekirdeğin Kalbi → Kadim Kulesi → Sis Yarığı (tehlike alanı altyapısı hazır).
6. **Lonca:** kurma/üyelik/kasa → şato → lonca savaşı → günlük kale.
7. **Arena** (1v1–5v5) ve Arena Market.
8. **Yönetim paneli** (38 bölüm): önce Genel, Açılış, Oyuncular, Güvenlik, Ekonomi.
9. **Premium/ÇP/E-PIN/ödeme** (sandbox adaptör), Şans Çarkı, etkinlikler.
10. Uzun süreli (60 dk) karma yük testi ve hedef VDS ölçümü.

## Çalıştırma
Bkz. README.md. Geliştirme: `npx tsx packages/server/src/main.ts` + `npm run dev -w @col/client`.
Önizleme (sunucusuz 3B sahne): `http://localhost:5173/preview3d.html?map=forest&lineup=chars`

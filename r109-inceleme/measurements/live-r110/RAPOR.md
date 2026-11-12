# R110 sonrası canlı CPU profili — 3 oyuncu

Kullanıcı R110_HANDOFF1 kurulumundan sonra (kurulum çıktısı: "R110 TAKILMA
DÜZELTMESİ TAMAMLANDI. Efsane ve Akademi hazır") 60 saniyelik ana süreç
profilini gönderdi; oyuncu sayısı **3**. Harita/etkinlik ve realm ayrıca
belirtilmedi. Profil SHA256:
`9e7bea1bc9f5688e7a2893f778897fc9d3972307adb5ecb4ae4b9f1b446e11ed`.

## Sonuç

- Kayıt 60,473 s, 28.173 örnek. Profiler başlangıcı (471 ms) hariç ana iş
  parçacığının örneklenmiş meşguliyeti **%9,51**. 1 sn pencereler: medyan
  %8,4, p95 %16,8, en yüksek %35,5; %90'ı geçen pencere yok.
- **Oyuncu WebSocket aktarımı ana süreçten çıkmış:** `pipe` aktarımı
  (`ondata`) 654 → 27 ms/dk, soket okuma (`onStreamRead`) 971 → 63 ms/dk,
  `writeGeneric` 649 → 98 ms/dk (R109 6 oyuncu → R110 3 oyuncu). Oyuncu
  sayısı yarıya indiği için yalnız bundan ~330 ms beklenirdi; kalan küçük pay
  HTTP istekleri (`proxyGameRequest`) ve diğer soketlerdir. R110 bağlantı
  devretmesinin canlıda etkin olduğunun profildeki izidir.
- Native SQL yaprak öz-süresi 1,01 s (R109 6 oyuncu: 3,02 s); native
  `prepare` kapsayıcı ~100 ms (411 ms); IPC paketleme `framed` 140 ms (741 ms);
  GC örnekleri 565 ms (673 ms); `drainWrites` kapsayıcı 1,74 s (5,43 s).
- En uzun örnek aralıkları ≤13 ms ve boşta (idle); R109 kaydındaki 21,5 ms'lik
  tek SQL örneği gibi uzun tekil blok görülmedi.

## Sınırlar

Oyuncu sayısı (3 ↔ 6), etkinlik ve süre farklı; bu bir nedensel önce/sonra
hızlanma testi değildir ve oyuncu başına bölünüp 30–40 oyuncuya kapasite
tahmini yapılmaz. CPU örnekleri tick p95/p99, >50 ms donma sayısı veya komut
yanıt süresi değildir. 30–40 oyuncu varken yeni profil ve `vmstat 1 60`
gerekir. Aynı ekranda gönderilen `vmstat` satırları düşük yükte alınmıştı:
`st` 0, CPU %95–98 boşta, aktif swap (`si`/`so`) 0.

Analiz: `evidence/profile-analysis.json` (`scripts/analyze-profile.py`).

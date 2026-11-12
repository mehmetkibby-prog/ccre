# Açık bulgular — çözülmüş gibi değerlendirilmemeli

R109 canlı Efsane sağlık kaydında 12 Kasım 2026'da doğrulandı. Paket Akademi'yi de
kapsıyor; aynı incelemede r2 HTTP erişimini ortam proxy'si 403 ile engelledi,
dolayısıyla bu tek kontrol r2'nin canlı durumunu doğrulamaz veya arızalı olduğunu
kanıtlamaz. Eski raporlardaki “henüz kurulmadı” cümleleri rapor yazım tarihine aittir.

1. **Kalan uzun komut yanıtı:** 40 oyunculu ortak boss testinde en uzun tek komut
   1.31 saniyeye çıktı. Tick p99 14–18 ms olsa bile yazıcı/ödül/receipt veya
   istemci kuyruğu beklemesi kullanıcıya yansıyabilir. Nedensel inceleme gerekiyor.
2. **Uzun döngü duraklamaları:** son altı 60 saniyelik R109 testinde en uzun ana
   duraklama 121.8 ms, kanal duraklaması 186.9 ms. Bütün koşularda sıfır >50 ms
   veya p99 <30 ms hedefi sağlanmadı. Host etkisi var; bütün maliyeti host'a atfetme.
3. **Canlı maliyet farkı:** 6 oyunculu CPU profilinde örneklenmiş ana meşguliyet
   %21.96. SQL öz-süre ~3024 ms, prepare ~335 ms, GC örnek toplamı ~672.5 ms.
   `drainWrites` kapsayıcı ~5427 ms; SQL/GC ile ayrıca toplanmaz. Tick/GC türü ve
   kesin donma sayıları bu profilden çıkmaz.
4. **Kule oyuncu raporu:** farklı tarayıcılardan üç hesapla oynarken bir ekranın
   moblarla birlikte durması, F5 sonrası rate limit beklemesi görüldü. Önceki
   `attack_frame_conflict` ve oturum/yeniden bağlanma düzeltmeleri R109'a dahildir;
   yeni bir kopmanın nedenini yalnız eski mesajla kesinleştirme. Terminal olay,
   sahiplik, kat geçişi ve bağlantı sağlığını birlikte incele.
5. **Bot temsil sınırı:** ekipman/uzmanlık, haritalar, boss, sohbet/yardımcı HTTP
   kapsanıyor. Gerçek kişisel verisi temizlenmiş canlı DB ve canlıya göre çıkarılmış
   trafik dağılımı yok. Bot maliyetinin gerçek oyuncudan düşük olması çözülmüş değil.
6. **Yayınlanmamış deneyler:** R110/R111 küçük iyileşmeler ve bazı gerilemeler verdi.
   R111 40 kişi/180 sn örneğinde saldırı tepe süresi ve RSS arttı. Bunları kurulmuş
   iyileşme veya tüm sorunun çözümü sayma. Ayrı raporlar korundu.

Hedef: 30–40 kişinin gerçekçi etkinliğinde hissedilen takılmayı gidermek;
50 oyuncuda p99 <30 ms ve >50 ms duraklama dakikada en fazla 1; uzun vadede 100.
Mevcut kanıt bu hedeflerin tamamının geçtiğini göstermiyor.

Başlangıç test sonuçları `HANDOFF_VALIDATION.md`; tarihi tam ölçümler
`project/r109_latency_completion/delivery/R109-olcum-raporu.md` ve `evidence/`.

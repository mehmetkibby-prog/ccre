# R110 sonrası ek iyileştirme denemeleri (uygulanmadı)

Kullanıcı R110'dan sonra ana süreç yükünün daha da azaltılmasını istedi.
Canlı 11 oyunculu profilde (measurements/live-r110) ana süreç %32,9 dolu;
işin büyük kısmı savaş kayıt yolu (yazma işleri 7,6 s/dk), kanala yanıt
gönderme (2,5 s/dk), sınıflandırılamayan native iş (1,9 s/dk) ve GC (1,2 s/dk).
Aşağıdaki denemeler aynı makinede, karışık sırayla, 50 oyunculu sentetik
yükle ölçüldü. **Hiçbiri ölçülebilir iyileşme vermedi; hiçbiri uygulanmadı.**

| Deneme | Sonuç | Karar |
|---|---|---|
| Ana süreç genç nesil boyutu (`--max-semi-space-size` 32/64 MB, 2'şer koşu) | GC süresi −%19/−%31; ana ELU (%35,8/35,6/35,8), komut yanıtı, tick aynı; 64 MB'ta tek tek duraklamalar uzadı (en uzun küçük GC 21 → 35 ms), RSS +250 MB | Uygulanmadı |
| Aynı turdaki IPC çerçevelerini tek gönderimde birleştirme (cork/uncork, 2'şer koşu) | Gönderimler 9.774 → 7.688/dk (−%21); ana ELU 36,6 ↔ 36,8, ana/kanal CPU, komut yanıtı aynı | Geri alındı |
| child_process IPC yerine özel soket çifti (mikro ölçüm) | 10 KB mesajda gönderen CPU 13–17 µs → 5–6 µs; dakikada ~10 bin gönderimde ~0,1 s kazanç, taşıma katmanı riski yüksek | Uygulanmadı |
| `command-failure-scope` SQL sarmalayıcısı (mikro ölçüm) | Sarmalayıcı başına ek maliyet ölçülemiyor (1,1–1,4 µs/çağrı, ham ile aynı); profilde ona yazılan süre SQLite'ın kendi işi | Koruma aynen kalır |

## Ne öğrenildi

- Yazma işlerinin ~%52'si native SQLite çalıştırma. Laboratuvarda dakikada
  ~179 bin sorgu çağrısı, yazma işi başına ~46 sorgu; en sık olanlar sahiplik,
  kabul, makbuz ve sürüm denetimleri (kurallar gereği kaldırılmaz).
- Kanala giden sonuç yanıtları dakikada ~13 bin, ortalama 6,7 KB (~94 MB/dk);
  maliyetleri JSON serileştirmedir. Küçültmek kanal çekirdeği ve kayıt/makbuz
  biçimine dokunur.
- Saldırı kuralları (`createAttackWriterRules`) her saldırıda RNG/saat
  bağlamıyla kurulur; önbelleğe almak RNG/seed garantisini riske atar.

## Sonraki büyük adım (karar kullanıcıda)

Ana süreç yükünü kat kat azaltacak güvenli bir küçük değişiklik kalmadı.
Büyük kazanç mimari değişiklik ister (ör. SQLite yazıcısını ayrı iş
parçacığına almak veya komut başına koruma protokolünü yeniden tasarlamak);
bunlar uzun, yüksek riskli işlerdir ve ancak 30–40 gerçek oyunculu canlı
ölçüm ana sürecin gerçekten doyduğunu gösterirse gerekçelendirilir.

Kanıt: `project/r109_latency_completion/evidence/semi-*`, `coal-*`,
`ipc-census-*`, `frame-census-*` (+ CPU profili); mikro ölçümler bu dizinde.

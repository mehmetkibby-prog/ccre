# R67 — Giriş hızı ve İlk Adımlar

Giriş işlemleri zaten koordinatörde sırayla ilerliyordu. Bu sırada her kalıcı yazımın yeni işler toplamak için ayrıca beklemesi, kuyrukta bulunan sonraki girişleri geciktiriyordu. R67 yalnız bu giriş kapsamındaki toplama beklemesini kaldırır. Yazma sırası, işlem sınırları, ödül worker kilidi, SQL geri alma ve diske kalıcı yazım tamamlanmadan yanıt vermeme davranışı korunur.

## Aynı kurulum ayarlarıyla karşılaştırma

Aynı makine, Node 22.22.0, aynı gerçek R66 kurulum bayrakları ve aynı 50 oyuncu testi kullanıldı. Her sürüm için bir karşılaştırma koşusu yapıldı.

| Ölçüm | R66 | R67 |
|---|---:|---:|
| İlk karakter girişi, ortanca | 854 ms | 724 ms |
| İlk karakter girişi, p95 | 1.642 ms | 1.368 ms |
| İlk karakter girişi, en yüksek | 1.716 ms | 1.422 ms |
| Yeniden giriş, p95 | 1.485 ms | 1.313 ms |
| 50 eşzamanlı ışınlanma, p95 | 547 ms | 596 ms |

İlk giriş p95 yaklaşık %16,7; yeniden giriş p95 %11,6 iyileşti. Işınlanma bu değişikliğin hedefi değildir; tablodaki değeri de aynen raporladık.

Her iki sürümde: 50/50 karakter girişi, 50/50 WebSocket bağlantısı, 50/50 ışınlanma, 50/50 başlangıç ödülü, 50/50 tekrar giriş; üç sınıf; çift karakter 0 ve beklenmeyen oyun hatası 0. Ödülün ikinci kez alınması reddedildi; mücevher, iksir ve tilki kayıtları kontrol edildi.

Önceki 4,3 saniye ölçümünde test kurulum bayrakları eksikti ve yazım toplama beklemesi 20 ms’lik varsayılan değeri kullanıyordu. Kurulu R66’daki ayar 2 ms’dir. Bu ölçüm farkı R67 kazanımı sayılmadı. Yukarıdaki sonuç, her iki gerçek kaynak sürümünün aynı doğru kurulum ayarlarıyla ölçümüdür.

Bu süreler izole ortamda gerçek yerel HTTP/SQLite/dört oyun süreci üzerinden ölçüldü. Merkezi imzalı yetkilendirme test aktarımıyla sağlandı. İnternet, mobil ağ, tarayıcı çizimi ve gerçek VDS ölçümü değildir. Giriş süresi HTTP karakter/giriş yanıtının tamamlanmasını ölçer; ekranın tümüyle çizilme süresi değildir.

## Güvenlik ve teslim kapsamı

Yazma sırası, eski sıranın korunması, diske yazım bekletilince erken başarılı yanıt çıkmaması, SQL hatasında doğru geri alma, fsync hatasında güvenli reddetme, ödül worker kilidi, bağlamın doğru veritabanıyla sınırlanması ve işlem bitince süresinin dolması kontrol edildi. Mevcut gerçek süreç/çökme testleri karakter, başlangıç ödülü, oturum, yetki ve giriş yerleşimini kapsar.

Eski testlerin yedisi gerçek R66’da da başarısız oluyordu: kanalın açıkça seçilmesi ve güncel savaş koruması yanıtı beklenmiyordu. Test uyarlamalarında yalnız test girdileri/karşılaştırmaları güncel sözleşmeye taşındı. Eski koordinatör senaryosunda ayrıca R47’nin eski presence mesajını yok sayması doğrulandı ve sabit test saati yeni AFK oturumundan önce ilerletildi. Bu sabit saat hatası R66 ve R67 kaynaklarında ayrı ayrı tekrarlandı. Üretim davranışları testleri geçirmek için değiştirilmedi; uyarlamaların ayrıntılı kaydı kanıt dosyalarındadır.

Paket giriş modüllerini, İlk Adımlar yerleşim yardımcısını, sürümlenmiş oyun istemcisini ve bunların manifestlerini günceller. HTTP dosyasındaki değişiklik yalnız istemci dosyası/varlık dizini adlarıdır; ters dönüşümün R66 dosyasını birebir verdiği doğrulandı. Ön kayıt sitesi ve hesap hizmetinin kodu aynıdır. Kurucu gerçek R66 kaynaklarını doğrular, bağımsız oyun sürümü hazırlar ve aynı hesap hizmetini çalışır tutar. Kurulum/geri alma testlerinde dosyalar, SQLite ve kayıt hizmeti gerçektir; systemd ile oyun sağlık sinyalleri taklit edilmiştir. Farklı servis UID’siyle dosya yükleme ayrıca gerçek süreçte kontrol edilmiştir.

## İlk Adımlar: Işınlanma düğmesinin görünürlüğü

Eski yönlendirme düğmenin kendi boyutunu izliyor, düğmeyi bulunca genel yerleşim gözlemini durduruyordu. Paneldeki bir satır veya yazı tipi sonradan yerleşince düğme boyutu değişmeden yeri değişebiliyor; balon eski yerde kalıp Işınlanma düğmesini kapatıyordu. Gerçek R66 bileşeni ve CSS ile Chromium’da bu durum tekrarlandı; R67 aynı senaryoda düğmeyi kapatmadı.

R67 yalnız eğitim açıkken ilgili menünün yerleşim değişikliklerini izler; bildirimleri tek animasyon karesinde birleştirir. Sürekli tarama zamanlayıcısı veya yeni sunucu isteği eklenmedi. Görünür düğme seçilir, değiştirilen düğmeye yeniden bağlanılır, balonun gerçek yüksekliği hesaba katılır ve ok hedef düğmeye hizalanır. Eğitim bitince gözlemciler temizlenir. Eğitim ilerlemesi veya ödül hakkı sıfırlanmaz.

1366×768, 1024×600, 390×844 ve 844×390 yerleşimleri; geç yüklenen panel, gizli ikinci düğme, düğmenin değiştirilmesi, ikinci adım ve eğitim sonu kontrolleri geçti. Gerçek oyun istemcisi ve dört oyun süreciyle masaüstü/mobil testlerinde ilk adım görünür, düğme tıklanabilir, ikinci adım doğru hedefte ve Kuzey Ormanı’na ışınlanma başarılıydı. Bu tarayıcı testlerinin yerel önbelleğinde bazı değişmeyen ses/dekor dosyaları yoktu; oyun JavaScript’i, yeni yardımcı modül ve test edilen arayüz çalıştı. Canlı sitenin tüm medya dosyaları taranmış sayılmaz.

## Tamamlanan kontroller

- 44 ayrı güvenlik/süreç senaryosu: geçti. Eski test sözleşmesi uyarlamaları yukarıda açıklandı.
- 8 kurulum/geri alma senaryosu: geçti. Kısıtlı servis UID’si ve umask 077 ile yeni modülün okunması dahil.
- 50 oyuncu, 90 saniyelik savaş kontrolü: 326 canavar ölümü; tamamlanmamış ödül 0, çift anahtar 0, beklenmeyen CHILD_EXIT 0, bağlantı kopması 0 ve temiz kapanış. Bu kısa koşu uzun süreli yük garantisi değildir.
- İlk giriş/tekrar giriş testinde 50/50 başarı; masaüstü ve mobilde yönlendirme ile gerçek ışınlanma başarılı.

Test ortamı 4 CPU kotası ve 32 GiB bellek sınırına sahipti; kısa savaş koşusunda süreçlerin en yüksek toplam RSS değeri yaklaşık 2,18 GiB idi. Kullanıcının 8 çekirdek/8 GB VDS’sine doğrudan erişilmedi ve bu paketin canlı kurulumu yapılmadı.

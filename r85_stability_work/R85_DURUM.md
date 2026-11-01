# R85 teslim kapsamı

Paketin son kaynağı `47e7486138ceb488d645e78c20c5c297d3ea423a7acb5cb4215a828ca17c6759`; güncelleme 46 dosyadır. Doğrulanmış oyuncu kilidi, ödül/toplama, istemci kuyruğu, bildirim ve oda sıralaması düzeltmeleri korunmuştur. Canlı VDS’ye kurulum yapılmadı.

**50 oyuncuda tam kararlılık hedefi açık kaldı.** Aynı kaynakta iki ayrı 180 saniyelik 50 oyuncu ölçümünün p99 değerleri 104,39 ve 113,72 ms’dir. Her ikisinde gerçek kısıtlanan kare ve girdi süresi sıfırdı. İkinci ölçümde üç yaklaşık 599 ms tahmin sınırı işareti oluştuğundan uzun kampanya geçilmedi; 100 oyuncu aşamasına geçilmedi.

Sonradan denenen iki kayıt zamanlaması değişikliği başarısız ölçümleriyle birlikte ayrıldı ve pakete alınmadı. Son kısa denemede beş sınır olayı ve gerçek kısıtlama görüldü; ikinci kısa deneme yapılmadı. Önceki başarısız sonuçlar silinmedi veya başarılı sayılmadı.

Seçilen kaynakta 99 kurulum/geri alma ve sekiz yerel oyun modu kontrolü geçti. Bu işlevsel doğrulama, kalan hareket gecikmesinin çözüldüğü anlamına gelmez. Ayrıntılı ölçümler `SONUC.md` içindedir. Tam oyun FPS’si, canlıda bütün lagın bitmesi veya uzun süreli kapasite garantisi verilmez.

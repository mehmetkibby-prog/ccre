# R91 doğrulama ekranı düzeltmesi

Oyuncu “Güvenlik doğrulaması hazırlanıyor…” ekranında kalabiliyordu. Durum isteği sonuçlanmadığında istemci aynı açık isteği sonraki kontrollerde tekrar bekliyor, zaman aşımı uygulamıyor ve okuma hatasını göstermiyordu. Tekrarlanan doğrulama bildirimleri de bekleyen yanıtı geçersiz sayabiliyordu.

R91, durum isteğinin başlık ve gövdesi için 12 saniye sınır koyar. Süre dolduğunda bekleyen okuma kapanır; mevcut otomatik kontrol yeniden istek açabilir. “Yeniden dene” önce eski okumayı sonlandırır ve yeni okumayı başlatır. Aynı doğrulama için tekrar gelen bildirimler güncel yanıtı sürekli geçersiz kılmaz. Eski karaktere veya iptal edilen isteğe ait gecikmiş yanıt kabul edilmez. Eksik/hatalı sunucu yanıtı kilidi kaldırmaz; hata oyuncuya gösterilir. Sunucu doğrulaması ve yanlış cevap sınırları korunur.

İstemci yeni dosya adı ve yeni varlık diziniyle yayımlanır. HTTP başvuruları, istemci kimliği ve sunucunun açılışta doğruladığı dosya hash'i aynı pakette güncellenir. R90 oda içi doğrulama ertelemesi korunur.

## Kurulum

Paket **düzeltilmiş R90_GAMEPLAY üzerine** hazırlanmıştır. Kaynak dosyalar eşleşmezse servisleri durdurmadan reddedilir. R89 üzerine veya farklı paketten yarım kalmış kurulumun üstüne uygulanmaz.

Dosya: `artifacts/CORE511_R91_DOGRULAMA.zip` (4.82 MB)

SHA256: `0b391cb9dbff9d066c9f35c597b3b6026ac3e835823ebbbc99b13a60f9d4471d`

Oyunu bakıma alıp oyuncular çıktıktan sonra 45 saniye bekle. ZIP'i `/root/CORE511_R91_DOGRULAMA.zip` olarak yükledikten sonra:

```bash
printf '%s\n' '0b391cb9dbff9d066c9f35c597b3b6026ac3e835823ebbbc99b13a60f9d4471d  /root/CORE511_R91_DOGRULAMA.zip' | sha256sum -c - &&
python3 -u /root/CORE511_R91_DOGRULAMA.zip --apply
```

**R91 TAMAMLANDI** mesajından sonra bakımı kapat. Oyuncular oyun sekmesini bir kez yenilemeli; açık sekmeler önceki istemciyi çalıştırmaya devam eder. Drive üzerinden aktarmak için bu ZIP yüklenmelidir; önceki R90 Drive bağlantısı R91 içermez.

Veritabanı yedeği ve sağlamlık kontrolü devam eder. Önceki canlı yedek doğrulaması yaklaşık 11 dakika sürmüştü; toplam kurulum daha uzun olabilir. Başarısız açılışta kod geri alınır, güncel oyuncu ilerlemesi eski yedeğe döndürülmez. Hesap servisi açık kalır. Yarım R91 kurulumu aynı ZIP ile `--recover` kullanılarak kurtarılır.

## Yerel doğrulama

- Masaüstü ve mobil Chromium'da eski kodun 31 saniye sonunda hâlâ tek takılmış isteği beklediği yeniden üretildi.
- Paket içindeki gerçek doğrulama fonksiyonları ve mevcut altı rakamlı soru bileşeniyle otomatik toparlanma, düğmeyle tekrar deneme, takılan yanıt gövdesi, tekrarlanan bildirimler, geç gelen eski yanıt, yanlış cevap, eksik yanıt ve bileşenin kapanması denetlendi. Tarayıcı hatası yok.
- Gerçek `NativeHttpServer.start` ile paketin HTTP dosyası açıldı: HTTP 200, R91 sürümü, dört kanal, kayıt işçisi ve tanılama hazır. Eşleşmeyen açılış kanıtı reddedildi.
- On kurulum/geri alma testi geçti: kurulum, tekrar kurulum, yanlış kaynak, değiştirilmiş HTTP/giriş dosyası, sağlık hatasında geri alma, işlem yarıda kesilince kurtarma ve yeni oyuncu ilerlemesinin korunması.
- ZIP CRC, modül/payload SHA256 ve paket yükleyicisi denetlendi.

Tarayıcı düzeneği gerçek React ve tarayıcı kullanır; diyalog çerçevesi sade DOM bileşenleriyle temsil edilir. Sunucu testi geçici SQLite verisi ve test hesap servisi kullanır; kaynak tesliminde bulunmayan SSR varlık haritası testte boş dosyayla tamamlanır. Bu, tüm oyunun tarayıcı testi veya canlı VDS kurulumu değildir. Canlı oyuncunun ağ kaydı henüz alınmadığından, oyuncudaki tetikleyicinin yalnız bu hata olduğu iddia edilmez.

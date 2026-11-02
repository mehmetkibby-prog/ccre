# R90 açılış düzeltmesi

Kurulum paketi: **CORE511_R90_DUZELTILMIS.zip**.
SHA-256: `d61728a0c604b1b8c3fb7aadfa0009d2fe6b49c55742b53daf2aa5ceac79e25c`.

İlk R90 paketi HTTP dosyasını değiştirmiş, açılışta denetlenen `native-http-composition-proof.json` dosyasını güncellememişti. Bu nedenle gerçek sunucu `native_http_server_entry_changed` hatasıyla açılmıyordu. Düzeltilmiş paket, HTTP dosyasıyla eşleşen doğrulama kaydını aynı işlemde günceller. Mevcut açılış doğrulaması korunur. Paketin HTTP/doğrulama eşleşmesi servisler durdurulmadan kontrol edilir.

R89'a otomatik geri alma tamamlandıktan sonra, oyun bakımdayken ve oyuncular çıkmışken kurulur. Eski paketle yarım işlem varsa önce **eski paketle** `--recover` tamamlanmalıdır. Tamamlanan R90 düzeltmesinin kurtarması/geri alması bu düzeltilmiş paketle yapılır.

ZIP'i `/root/CORE511_R90_DUZELTILMIS.zip` olarak yükledikten sonra:

```bash
printf '%s\n' 'd61728a0c604b1b8c3fb7aadfa0009d2fe6b49c55742b53daf2aa5ceac79e25c  /root/CORE511_R90_DUZELTILMIS.zip' | sha256sum -c - &&
python3 -u /root/CORE511_R90_DUZELTILMIS.zip --apply
```

Yalnız **R90 TAMAMLANDI** mesajından sonra bakım kapatılır. Veritabanı yedeği ve sağlamlık kontrolü yine çalışır; canlıda önceki yedek kontrolü yaklaşık 11 dakika sürmüştü.

## Doğrulama

Eski açılış hatası gerçek `NativeHttpServer.start` yolunda yerelde yeniden üretildi. Düzeltilmiş paketle gerçek HTTP dinleyicisi HTTP 200 döndürdü; dört kanal, kayıt işçisi ve tanılama uçları hazırdı. On kurulum/geri alma kontrolü geçti. ZIP bütünlüğü ve paket yükleyicisi doğrulandı; eşleşmeyen HTTP doğrulama kaydı servis erişiminden önce reddedildi.

Bu kontroller geçici yerel veritabanıyla yapıldı. Hesap servisi imzalı yanıtları test düzeneğinde karşılandı; eksik SSR varlık haritası test için boş haritayla tamamlandı. Tam tarayıcı oynanışı, 50 oyuncu testi veya canlı VDS'de başarılı kurulum iddiası yoktur.

Uzun, kodlanmış terminal komutu yerine bu hazır ZIP kullanılmalıdır. O komuttaki aktarım hatası düzeltilmiş ZIP'in içeriğini etkilemez.

# R117 — Azrail Kancası %10

Kaynak tam R116_ADMISSION_TRANSFER1, hedef R117_HOOK10. Kaynak ZIP
`R116_ADMISSION_TRANSFER_568aca987578.zip`, SHA256
`f8399793db7d40af7f873b4a892759c7c71c19f70bb4c45995b00b68d3071ac9`.

Azrail Kancası sandık olasılığı %6 yerine %10 olur; miktar 1 kalır. Eski %6
ayar kayıtları okunurken %10 olarak yorumlanır. Kurulum mevcut ayar JSON'unu,
oyuncu verilerini veya şemayı yazmaz. Diğer ödüllerin oranları değişmez.
Oyun ve yönetici arayüzündeki açıklamalar yeni oranla eşleştirilir; önbellek
uyumu için yeni hash'li istemci modülleri ayrı varlık dizinine kurulur.

Dokuz gözden geçirilmiş kaynak dosyası ve beş yeni istemci modülü kurulum
sözleşmesine bağlıdır. İki realm, sekiz kanal, R117 sürüm işareti ve %10 sağlık
değeri doğrulanmadan kurulum tamamlanmaz. Efsane bakımı, Akademi kapalı/ön kayıt
ayarları korunur. Yalnız değişen kod yedeklenir; tam DB taraması yoktur.
Geri dönüş tam R116 kodunu ve eski istemci yollarını geri getirir, yeni modül
ve varlık dizinlerini kaldırır; oyuncu ilerlemesi geri alınmaz.

Eski ZIP'ler değişmez. Tarihsel kurtarma arşivleri önceki kurucunun koruyucu
saklama politikasıyla korunur. Yeni içerik farklı kimlikli bir ZIP üretir.

Kurulum: [KURULUM.md](KURULUM.md). Yerel komutlar:

```bash
python3 project/r117_hook_rate/build/package.py
python3 project/r117_hook_rate/tests/installer_test.py -v
python3 project/r117_hook_rate/tests/stage-runtime.py
python3 project/r117_hook_rate/tests/installed-runtime.py
```

Node.js 22.23.4 için `REVIEW_NODE` kullanılabilir. Testler sentetik yerel
veriyle çalışır. Paket ve kabul sonuçları `evidence/` altında kaydedilir.

Kurulum kabulü: 11 kurucu/geri dönüş testi ve kurulu çıktıda 3 gerçek runtime
testi geçti. İki realm ve sekiz kanal R117/%10 sağlık değerini yayımladı;
WebSocket aktarımı çalıştı. Eski istemci varlıkları, oyuncu ilerlemesi ve bakım
ayarları korundu; geri dönüş yeni modül ve varlık dizinlerini kaldırdı.
İlk izin testi tarihsel fikstürdeki mevcut 0600 dosyaları için yanlış beklenti
kullanıyordu; mevcut izinlerin korunması ve yeni dosyaların 0644 olması
doğrulanacak şekilde düzeltildi. Ham sonuç `installer-fixture-permissions.log` içinde korunur; kurucu kodu bu nedenle değişmedi.

# R81: ana işlemde bekleyen ödül alıcısı sorgusu

Bu paket yalnız doğrulanmış R80_GAMEPLAY üzerine uygulanır. Üretim kodunda iki dosya değişir: `abandoned-normal.mjs` içindeki sorgu iyileştirmesi ve `native-http-bindings.mjs` içindeki R81 sağlık sürümü etiketi. Kaynak ve sürüm manifestleri de yeni kimlikleri için güncellenir.

## Kurulum

1. Oyunu yönetim panelinden bakım moduna al veya mevcut ön kayıt modunu koru.
2. Oyundan ve oyuncu/admin oyun oturumlarından çık; en az 45 saniye bekle.
3. `CORE511_R81_TOPLU.zip` dosyasını VDS'de `/root/` dizinine yükle. Paketle verilen SHA-256 değerini doğrula.
4. Root terminalinde aşağıdaki komutları çalıştır:

```bash
python3 -u /root/CORE511_R81_TOPLU.zip --check
python3 -u /root/CORE511_R81_TOPLU.zip --apply
```

İlk komut uygunluk kontrolüdür. Yalnız başarılı olursa ikinciyi çalıştır. Kurucu tam kaynak/Node/HTTP kimliğini, oyun oturumlarının kapalı olduğunu, hesap servisini ve aynı veritabanını kullanan günlük yedek kilidini doğrular. Oyun servislerini durdurur, SQLite backup API ile sağlamlığı kontrol edilen güncel yedek alır, iki dosyayı ve manifestlerini yerinde değiştirir, dört kanalı doğrular. Oyun erişim tercihi korunur; açılışı yönetim panelinden yap.

Başarılı sonuç: `R81 TAMAMLANDI`.

## Kesinti ve geri alma

Kurulum yarıda kalırsa aynı paketle:

```bash
python3 -u /root/CORE511_R81_TOPLU.zip --recover
```

Başarıyla tamamlanan R81'i geri almak için önce yine bakım/ön kayıt ve boş oyun koşullarını sağla:

```bash
python3 -u /root/CORE511_R81_TOPLU.zip --rollback-latest
```

Geri alma yalnız önceki R80 kodunu getirir ve güncel oyun veritabanını korur. Oyun veritabanı eski yedeğe döndürülmez. Hesap servisi yeniden başlatılmaz. Kurucu sağlıklı açılışı doğrulayamazsa oyun servislerini durdurup başlatma korumasını korur; aynı paketle kurtarma gerekir.

## Canlı doğrulama

Kurulum sonrası aynı oyun koşullarında ana işlem yüzdesini ve R80 ölçüm aracını yeniden kullan. Yönetim panelinden 60 saniyelik Ana işlem CPU profili alınabilir. Yerel sorgu testindeki kazanç, tüm VDS CPU'sunda aynı oranda düşüş vaadi değildir.

# Core of Life R83 — kurulum

Bu paket doğrulanmış **R82_GAMEPLAY** üzerine uygulanır. Üç mevcut sunucu
dosyası değişir; değişiklikler, tamamlanmış karakter işleminin arka plan görev
kuyruğunun cevabını beklemesini kaldırır ve sağlık yanıtındaki sürümü R83 yapar.

## Hazırlık

1. Yönetim panelinden bakım veya ön kayıt durumunu kaydet.
2. Oyuncular ve oyun içindeki yönetici çıktıktan sonra 45 saniye bekle.
3. `CORE511_R83_TOPLU.zip` dosyasını VDS'de `/root` dizinine yükle.
4. Dosyanın SHA-256 değerini birlikte verilen sağlama dosyasıyla veya sohbetin
   kurulum komutundaki sabit değerle doğrula.

ZIP ve sağlama dosyası `/root` içindeyse:

```bash
(
  set -euo pipefail
  cd /root
  sha256sum -c CORE511_R83_TOPLU.sha256
  python3 -u /root/CORE511_R83_TOPLU.zip --check
  python3 -u /root/CORE511_R83_TOPLU.zip --apply
)
```

Başarılı kurulum sonunda **R83 TAMAMLANDI** yazmalıdır. Yönetim panelinden
oyunu açıp oyun sayfasını bir kez yenile. Sağlık yanıtında
`updateVersion: R83_GAMEPLAY` ve dört hazır kanal bulunmalıdır.

## Kurucunun yaptığı kontroller

- Kurulu R82 kaynak kimliği ve tam 1166 satırlı kaynak manifesti.
- Paket dosyalarının önceki ve sonraki SHA-256 değerleri.
- Mevcut Node 22.23.4, SQLite 3.53.4 ve kayıt işçisi kimliği.
- Bakım/ön kayıt durumu, boş oyuncu oturumları ve yönetim durumu.
- Günlük yedekle aynı veri dizinine bağlı kurulum ve yedek kilitleri.
- Gerçek SQLite yedekleme API'siyle alınan yedek ve `quick_check`.
- Ayrı hesap servisinin kimliği ve oyun veritabanının kimliği.
- Kurulum sonrası R83 sağlık yanıtı ve dört kanalın hazır olması.

Geri alma, eski kodu **güncel veritabanıyla** çalıştırır. Kurucu eski bir
veritabanı yedeğini canlı verinin üzerine geri yüklemez. Oyunu açma işlemi
yönetim panelindedir.

## Kesinti veya hata

Bir adım hata verirse çıktıyı koru. Kurucu başka sürümün yarım işlem kaydını
sahiplenmez. Yalnız bu R83 işlemi yarıda kaldıysa aynı dosyayla kurtarma:

```bash
python3 -u /root/CORE511_R83_TOPLU.zip --recover
```

Tamamlanmış R83 kurulumunu R82 koduna geri almak gerektiğinde, bakım/ön kayıt
ve boş oyuncu koşulları sağlandıktan sonra:

```bash
python3 -u /root/CORE511_R83_TOPLU.zip --rollback-latest
```

Kurulum kaydını veya başlatma korumasını elle silmek bu iş akışının parçası
değildir. Aktif başka güncelleme varsa onun kendi paketiyle tamamlanmalıdır.

## Kapsam

Bu paket, testte yeniden üretilen belirli bir hareket duraksamasını düzeltir.
31 Ekim 13:45:36 bildiriminin özel sunucu kayıtları ve yönetici ölçüm çıktısı
paylaşılmadığı için o olayın bu beklemeden kaynaklandığı doğrulanmış değildir.
Tek başına tüm ağ, görüntü ve oyun duraksamalarının bittiği iddiası taşımaz.

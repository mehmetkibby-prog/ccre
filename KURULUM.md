# Core of Life R62 — oyun ve ön kayıt sitesi

Bu paket R61 performans/ses güncellemesinin üzerine kurulur. Ön kayıt sitesi için önceki admin kontrollü sürüm `20261026-4385eb249bd8` gerekir. Kurucu farklı veya değiştirilmiş bir tabana yazmaz. Site ve oyun aynı VDS'deyse birleşik komutları kullanın.

1. Admin panelinden oyunu bakıma alın; bağlı oyuncuların çıkmasını bekleyin.
2. `CORE_OF_LIFE_R62.zip` dosyasını VDS'ye yükleyin. ZIP'i açmak gerekmez.
3. Dosyanın bulunduğu klasörde root olarak çalıştırın:

```bash
python3 CORE_OF_LIFE_R62.zip --check && python3 CORE_OF_LIFE_R62.zip --apply
```

İki bileşenin ön kontrolü de kurulumdan önce yapılır. Oyun kurucusu mevcut DB'yi yedekler, bütünlük kontrolünü yapar ve dört kanalı doğrular. Ön kayıt kurulumu başarısız olursa kendi önceki sitesini geri getirir; bu çalıştırmada yeni kurulan oyun güncellemesi de geri alınır. Güncelleme sonunda oyun bakımda kalır. Oyuna giriş, sandık açma/satış ve ön kayıt ekranını kontrol edip admin panelinden açın.

Ön kayıt ekranının görünürlüğü, sayaç ve açılış zamanı mevcut admin ayarını izler. Kurucu bu ayarı veya hesapları değiştirmez. Var olan video ve sınıf görselleri SHA-256 ile doğrulanarak yeniden kullanılır.

## Geri alma

Oyunu tekrar bakıma alın ve çalıştırın:

```bash
python3 CORE_OF_LIFE_R62.zip --rollback-latest
```

Önce site, ardından oyun önceki sürüme döner. Oyuncuların güncel eşyaları ve ilerlemesi korunur; eski DB yedeği oyuncu verilerinin üzerine yazılmaz. R61'in mevcut Node başlangıç ayarı korunur.

## Özellik anahtarları

```bash
python3 CORE_OF_LIFE_R62.zip --flags
python3 CORE_OF_LIFE_R62.zip --set-flag CORE511_R62_VERIFICATION=0
```

Anahtar değişiklikleri de bakım ister. Dört yeni anahtar varsayılan olarak `1`:

| Anahtar | Görevi | `0` olduğunda |
|---|---|---|
| CORE511_R62_AZRAIL | Yeni ikon, açıklama ve Dünya duyurusu | Önceki görünüm; yeni sandık duyurusu yok |
| CORE511_R62_CHEST_MARKET | Azrail sandığı pazar listesi ve native malzeme tanımı | R61 pazar davranışı |
| CORE511_R62_INVENTORY | Ekipman yazıları ve düğme düzeni | Önceki CSS düzeni |
| CORE511_R62_VERIFICATION | Altı rakamlı oyun içi doğrulamada tek kuyruk geçişi | R61'in iki kuyruk geçişi |

Site ayrı makinedeyse `--site-only --check`, `--site-only --apply` seçeneklerini o makinede; oyun için `--game-only --check`, `--game-only --apply` seçeneklerini oyun VDS'sinde kullanın. `--game-only` ve `--site-only` sonrasındaki seçenekler doğrudan ilgili kurucuya aktarılır.

R61 kurulumu sırasında kullanılan `CORE511_R46.zip` doğrulama arşivi `/root/CORE511_R46.zip` konumunda veya bu birleşik ZIP ile aynı klasörde durmalıdır. Kurulum için önceki yedek ve doğrulama dosyaları yerinde kalmalıdır. R62 sitesi kendi `r62-rewards` kurulum kaydını tutar; önceki admin kontrollü site güncellemesinin kaydını korur. Kurucu uyumsuz taban bildirirse zorla atlatmayın; gösterdiği dosya/sürüm hatasını inceleyin. Bu paketin canlı VDS kurulumu yapılmadı.

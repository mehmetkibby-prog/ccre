# Güncelleme ve yedek ilkesi — 10 Kasım 2026

Kullanıcı R101'in tam veritabanı taraması ve sıkıştırmasının uzun sürmesi üzerine
sonraki güncellemelerde kısa bakım ve yalnız bir önceki sürüme dönüş için gereken
yedeğin saklanmasını istedi. Uzun VDS komutları istemiyor.

- Normal kod/arayüz/hata düzeltmesi: yalnız değişen dosyaların eski içerikleri
  yedeklenir. Tam sürüm kopyası, tam SQLite taraması ve veritabanı sıkıştırması
  bu kurulum yolunda çalıştırılmaz. Şema/veri değişikliği olmadığı kod incelemesi
  ve sabit payload kimlikleriyle doğrulanır; yalnız bir etikete güvenilmez.
- Kurulumun kendi yedeklerinde tek, bağımsız bir önceki sürüme dönüş kaydı
  tutulur. Bu kaydın bütün dosyaları ve gömülü eski ayarları doğrulanmadan
  önceki sağlam yedek silinmez. Normal başarı sonrasında eski tamamlanmış kod
  yedekleri temizlenir. Yeni yedek hazırlanırken eski sağlam yedek geçici olarak
  birlikte kalır; yeni doğrulama başarısızsa eski korunur.
- Efsane/r1 ve Akademi/r2 aynı sürümde, her birinin dört kanalı hazır olmadan
  saklama temizliği çalıştırılmaz. Paket her iki sunucuyu birlikte günceller.
- Veri/şema/ortak ÇP geçişi kod güncellemesi gibi işaretlenemez. Etkilenen veriler
  için doğrulanmış tutarlı yedek gerekir. Ağır hazırlığı bakım dışına almak için
  gerçek snapshot tutarlılığı kurulmalıdır; canlı dosyayı `cp` ile kopyalamak,
  eski yedeği güncel saymak veya `quick_check` kontrolünü atlamak kabul edilmez.
- Günlük oyuncu verisi yedekleri ile kurulumun önceki sürüm yedeği aynı şey
  değildir. Bu çalışma günlük zamanlayıcıları, onların mevcut saklama sayılarını
  veya canlı SQLite içeriğini değiştirmedi. Canlı veritabanının büyümesi ayrı
  ölçülmelidir; bir kod yedeği sınırı tüm disk büyümesini durdurmaz.
- Çalışan kurulum, yarım kurtarma, yabancı/değişmiş dosya ve eski biçimdeki veri
  yedekleri otomatik silinmez. Bilinmeyen kayıtlar adlarına/yaşlarına bakılarak
  temizlenmez. Güncel servislerin kullandığı eski sürüm dizinleri de korunur.

Uygulanan ortak bileşenler: `update_policy_v1/modules/update_policy.py` ve
`update_policy_v1/modules/code_retention.py`. Kullanım ve sınırlar için
`update_policy_v1/README.md` okunmalı. Bunlar sonraki paket oluşturucusunun
kullanacağı yerel bileşenlerdir; şu an VDS'ye yüklenmiş bir yeni kurucu değillerdir.
Eski R100 kurucusu R101'in iki sunucusuna doğrudan uygulanamaz.

## Güncel R101 durumu

10 Kasım 11:51 eski R101 denemesi geri alındı. 11:59 günlükteki
`EACCES /etc/coreoflife-r101/realms.json` hatası doğrulandı. Eski Drive dosyası
`1KMNBYsRkAPGZ_xlnquhHPskbs9ejbXHp` / SHA `cdde965d...` tekrar kurulmaz.
Bu denemenin tam yedeği kurucu tarafından silinmiştir; tekrar kullanılabilir
sayılmaz. Tamamlanan geri dönüş için `--recover` önerilmez.

Kullanıcı hızlandırmayı bu R101'e dahil etmemizi açıkça istedi. Güncel çalışma:
`r101_loadlab_isolation/WORK_STATE.md`. Yeni paket
`R101_AKADEMI_ACILIS_DUZELTMESI.zip` 13:41 kullanıcı ekranına göre VDS’ye kuruldu. SHA256 için
`r101_loadlab_isolation/evidence/package.json` kullanılmalı; eski ZIP'ler değişmedi.

İncelenmiş R101 payload'ı birincil oyuna sadece boş ek tablolar ve aktarım
kimliği ekler; eski ÇP tablolarını yalnız okur. Bu özel geçişte tutarlı ve
satır/bütünlük/hash doğrulamalı iki ÇP tablosu yedeği + tam küçük hesap yedeği
alınır. Ana oyuncu SQLite dosyasının tamamı taranmaz/sıkıştırılmaz. Bu kapsam
`migration_contract.py` ile kaynak/hedef/tüm payload kimliklerine bağlıdır;
başka veri değişiklikleri için körlemesine tekrar kullanılmaz.

Yeni R101 kurucusu izin hatasını ve ayrıca testte üretilen ÇP import SQL
sütun sayısı hatasını düzeltir. Ortak ÇP geçişinden sonra ileri kurtarma zorunlu;
eski bağımsız ÇP otoritesine otomatik dönüş yapılmaz. Yeni kayıt tüm eski
kod/ayar/STATE içeriğini kendi içinde tutar. İki dünya ve yayın doğrulandıktan
sonra bilinen eski tamamlanmış kod yedekleri kimlik/hash/atomik silme kaydıyla
temizlenir. Eski tam veri yedekleri, günlük yedekler ve yabancı kayıtlar korunur.

Son VDS sonucu (13:03): d824a3... hızlı paket denendi. 260 KiB ÇP ve küçük
hesap yedeği başarıyla tamamlandı; r1 ve hesap servisi hazır oldu, r2 HTTP
açılış kontrolü doldu. Önceki oyun doğrulanarak geri dönüldü; R101 kurulu değil.
13:11 yeni günlük: r2 /etc/col-loadlab-live/runtime.json için EACCES ile kapanıyor.
Bu önceki realms.json hatasından farklıdır; DNS ile ilgili değildir.

Yeni paket ana süreç ve veri okuyucusunda yük testi ayarını doğrulanmış SQLite
sunucu kimliğine bağlar. Akademi ana sunucunun özel ayarını okumaz. Her iki
sunucunun kalıcı test kaydı/iptal koruması korunur; Efsane davranışı aynıdır.
Veri geçişi ve hızlı yedek kapsamı değişmez; sözleşme yeni dosyalara bağlandı.
55 Python + 10 Node testi geçti; gerçek runtime-entry/HTTP/4 kanal ve izin engeli
üzerinden eski hata üretildi, yeni açılış doğrulandı. Canlı VDS testi değildir.
Yeni ZIP kullanıcıya verilip yeni Drive bağlantısı üzerinden kısa komutlarla
kurulmalıdır. Tamamlanmış geri dönüşe --recover veya eski ZIP tekrar önerilmez.

13:41 SON DURUM: 2ea35dd8... paketinin kurulumu tamamlandı. Efsane bakımda,
Akademi kapalı/izinli test erişiminde. Kurulum ekranı iki eski kod yedeğinin
temizlendiğini doğruluyor. R101’i tekrar --apply/--recover ile çalıştırmayın.
Kullanıcının istediği DNS içe aktarım dosyası `r101_dns/CORE_AKADEMI_CLOUDFLARE.txt`.
İki Akademi CNAME’i mevcut r1 adresine bağlı; Caddy alan adına göre ayırır.
Cloudflare’a yükleme sonucu ve dış erişim doğrulaması bekleniyor.

11 Kasım R103 giriş uyumluluğu ek kontrolü: dağıtılacak portal/giriş/admin
modülünü AbortSignal.any ve AbortSignal.timeout tanımsızken test edin.
Hata/bozuk yanıt/zaman aşımı yükleme durumunu bitirmeli; tekrar deneme
çalışmalı; iptal listener ve timer'ları temizlenmeli. Sadece fetch başlığı
değil JSON gövdesinin beklemesi de sınırlanmalı. Tek kullanımlık giriş ve
karakter seçim POST'larını otomatik tekrar göndermeyin. Kanıt örneği
r103_release/tests/entry-browser.mjs ve request.test.mjs. Üretim dört kanallı;
portal cache doğrulaması eski üç-kanal varsayımına dönmemeli.

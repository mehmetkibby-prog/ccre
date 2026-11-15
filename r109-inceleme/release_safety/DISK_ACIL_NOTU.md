# 16 Kasım 2026 — disk alanı acil müdahalesi

Kullanıcının 00:59 Türkiye saati ekranında R121 kurulumu tamamlandı. Kök
dosya sistemi 196G, kullanılan 187G, kullanılabilir yaklaşık 832M.
`/var/lib/coreoflife-realms-417/r1/game.sqlite` 128G; WAL 8.3M.
9.2G yedek `r1/backups/game-backup-2026-11-09T02-00-01-434Z.sqlite.gz`.
Aktif veri veya tek görünen yedek silinemez. 128G'nin tablo dağılımı ve
freelist miktarı henüz canlıdan ölçülmedi; büyümenin kesin nedeni bilinmiyor.

`DISK_ACIL_R121.py --relieve` yalnız doğrulanmış aynı kök ext4 aygıtında
ayrılmış blokları azaltır; en az 2 GiB veya %1 (hangisi büyükse) bırakır.
Önceki rezerv zaten daha düşükse artırmaz. Önceki blok sayısını geri alma
komutuyla yazdırır. Bu kalıcı temizlik veya veritabanı küçültme değildir.

Ardından en çok 10 saniyelik ayrı salt okunur SQLite sürecinde page_count,
freelist_count, auto_vacuum ve dört geçici kayıt ailesinin ilk kayıt yaşı
okunur. Tablo sayımı, dbstat, VACUUM, checkpoint, DELETE yapılmaz. Oyuncu
kimliği/mesajı/parolası veya makbuz içeriği yazdırılmaz. Bakım servisinin
sonuç/zaman ve timer etkinlik bilgisi alınır. Servis yeniden başlatılmaz.

Yerel 6 test geçti: ayrılmış alan alt sınırı, düşük rezervi artırmama,
bozuk metaveriyi reddetme, ext4 dışına dokunmama, doğrulanmış aygıtta yalnız
rezerv komutu, SQLite dosya içeriği SHA256 değişmeden freelist ölçümü.
Gerçek üretim ext4 müdahalesi/alan kazanımı henüz doğrulanmadı.

Sonraki karar için canlı DB ICINDE BOS / DB VERI-INDEKS ve kayıt yaşları
gerekli. Büyük kullanılabilir freelist varsa güvenli küçültme planı;
dolu sayfalar ağır basıyorsa güvenli kayıt saklama/silme hızı ve tablo
büyümesi araştırılmalı. Yalnız dosya boyutuna bakarak satır silinmez.

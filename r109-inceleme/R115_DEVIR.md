# R115 devir — 13 Kasım 2026

Dal: `codex/r115-shared-scope`. Aktif kod aynı dizinde:
`project/r109_latency_completion/working`.

Canlı: kullanıcı + Efsane salt okunur sağlık kontrolü R114_RUNE_FORUM1 kurulu
olduğunu doğruladı. R115 burada yalnız hazırlanıyor; VDS/SSH erişimi yok.
Sonraki paketin kaynağı tam R114 olmalıdır.

Bildirim: şiddetli kısa lag. Gelen journal ekranında
`shared_partition_actor_changed` → beş süreç SIGKILL → `global_world_busy`.
İlk ve terminal oyuncu kapsamları farklıydı: başlangıç yerel canavara daha
önce vurup ayrılmış oyuncuyu atlıyordu. Gerçek R114 kurulum ağacında aynı
hata yeniden üretildi. Düzeltme kapsamları aynı yetkili hesapla oluşturur.
Güvenlik doğrulaması veya belirsiz işlemde kurtarma kaldırılmadı.

Çalışma ve test ayrıntıları: `project/r115_shared_scope/README.md`.
Paket kaydı: `project/r115_shared_scope/evidence/package.json`.
Kurulum: `project/r115_shared_scope/KURULUM.md`.
Kaynak ZIP R114_FORUM_47c1d3316429, SHA256
68dad6638a1b6911d0d499d2b3042e6d99dc1f51862567e6325654304bbcf2cf.
Kaynak core 5839b7a3fb0f0f6ba1e1656333cc149ea4469816a641a7c25d1a5f5105e3d342.
Hedef R115_SHARED_SCOPE1, üç sunucu dosyası, DB/şema değişikliği yok.

Son kabul sonucu `evidence/verification.json` dosyasında kaydedilir.
Ham önce/sonra başarısızlıklar ve ölçüm sınırları saklanır. 50 oyuncu ölçümleri
4 CPU kotalı yerel sentetik ortamdır; yalnız 50, 30/40/100 test eklenmedi.
Forum, rün haritaları, giriş/arayüz, SQLite/ödül/epoch kuralları korunur.

Çalışma öncesinden kirli R110/R112 kanıtları ayrı bırakıldı. Eski ZIP ve
hash'lere dokunulmadı. Yeni build aynı adla dosya üzerine yazmaz.

Kabul tamamlandı: `evidence/verification.json`. Paket artifacts/R115_SHARED_SCOPE_a668b021b2e3.zip,
SHA256 791858ebddc240c5330e663b569982305fb5acb0c8645adde77e86ed1a6603ea.
Yedi 50 kişilik koşu geçti; yeni sürümün dört koşusunda toplu kurtarma sıfır.
Genel kısa duraksamalar sürüyor; README önce/sonra tablosu bunları açıkça kaydeder.
Henüz canlıya kurulmadı.

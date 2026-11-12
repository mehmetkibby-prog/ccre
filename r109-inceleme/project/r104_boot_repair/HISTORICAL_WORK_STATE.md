## Son canlı sonuç — 17.41

Bootstrap R103_STARTUP1 iki sunucu/sekiz kanal ile tamamlandı. Tam R104
son adımda Akademi Dünya Canı guardında durdu ve R103_STARTUP1
sürümüne başarıyla geri döndü. Ayrıntı: ../r104_world_gate_incident/WORK_STATE.md.
Yeni paket kuruldu varsaymayın; aşağıdaki teslim/kimlik bilgileri geçerlidir.

# R104 açılış onarımı — 11 Kasım 2026

## Yetkili güncel durum
Kullanıcı 17.14 ekranında `read_worker_result_too_large` / `channel_start`,
R103_SKILLS1 ve pending:true bildirdi. R104_AKADEMI3 geri dönüşü kodu geri
yazmış, ancak eski 4 MiB açılış sınırı yüzünden Efsane yeniden açılamamış.
Yeni paket hazır; **canlıya kurulmadı**, VDS kabuk erişimi yok.

Teslim: `delivery/r104-acilis-onarim.zip`
Sürüm: R104_AKADEMI4; sağlık işareti readerBoot:R104_BOOT1.
SHA256: 95c46e794e5b7032cc22c6424634ca4dd426597738789fb1ec1e52758a2cc8aa
Boyut: 3851540 bayt.
Çekirdek: 646daf2e6fdcdddf2dec52765e0ff7fce876d5ff4273922b40970acc199e0169
İstemci namespace: core511-449b7b47593b11bf (onaylı R104 istemcisi aynıdır).
Önceki teslim ca09bf1a... / r104-toplu-guncelleme.zip değişmedi.

## Uygulama yolu
Yeni Drive bağlantısı gelince SHA doğrulanarak `/root/r104-onarim.zip` indir;
`python3 /root/r104-onarim.zip --check`, sonra `--apply` ver. Kullanıcı kısa,
kopyalanabilir blok istiyor. Eski `/root/r104.zip --apply/--recover` önerilmez.
Bir yeni paket iki aşamayı yürütür; kullanıcı iki eski paketi peş peşe kurmaz.
Kaynak yalnız R103_SKILLS1 veya bu onarımın R103_STARTUP1 kaynağıdır.

1. Bilinen başarısız R104_AKADEMI3 kaydında kod/STATE/manifest/iki ayarın geri
   döndüğünü doğrular; farklı kod, ayar veya kayıt varsa işlemi durdurur.
2. R103 açılışına dört sabit kod düzeltmesi ve çekirdek kimliği yazar.
   Küçük kod yedeği ve kesinti journal'ı `startup-repair.json` içinde korunur.
   Önce iki gerçek realm/sekiz kanal sağlığı doğrulanır; eski pending sonra kalkar.
3. R104 toplu içeriğini uygular. Geri dönüş artık R103_STARTUP1'e yapılır;
   dolayısıyla büyük veri hatasını tekrar oluşturan eski okuma sınırı geri gelmez.
   Yedek temizliği iki realm doğrulanmadan yapılmaz; tek önceki kod yedeği kalır.
Bakım ve dünya döngüsü korunur. Kurulumda oyuncu DB tarama/kopya/sıkıştırma yok;
ön kayıttaki iki mevcut accounts ayarı dar snapshot/CAS ile değişir.

## Düzeltmeler
- Yalnız özel kernel511_channel_boot/world_boot okuması 32 MiB; normal sorgu
  4 MiB. Satır filtreleme/kesme/silme yok. Boyut taşmasında sorgu ve gerçek
  bayt sayısı Error.readInfo'ya eklenir. Kuyruk ve 192 MiB worker sınırı aynı.
- Büyük kanal kapanışında global dünya kilidi normal 2048 sınırına takılıyordu.
  Yalnız `worldTransition:true` ve `global:world` kaynağıyla 32768 sınırı;
  normal komut 2048, çakışma/bilinmeyen commit kilidi kuralları korunur.
- Tüm önceki R104 özellikleri: sunucu seçimi, Akademi ön kayıt/kartlar/izinli
  erken erişim/20 Kasım 2026 20.00 Türkiye açılışı, oto av oturumu ve sohbet.

## Kanıt
`evidence/release-validation.json`:
- 28 kurucu/kurtarma/geri dönüş/CLI testi geçti. Eski gönderilmiş ZIP ile gerçek
  başarısız R104 apply+rollback dosyaları üretildi. Systemd/HTTP adaptördür.
- 11 okuyucu/kuyruk/limit testi geçti. Aynı 15000 kayıtla eski hata üretildi;
  yeni worker 5.92 MB okudu, kayıtlar korundu, sıradan 4 MiB sınırı korundu.
- Dağıtılacak ve geri dönüş sürümlerinin her birinde gerçek runtime-entry,
  iki realm ve sekiz kanal, 15000 ek kalıcı canavar / 6.1 MB boot snapshot ve
  temiz kapanış geçti. Geliştirme dizini dışındaki gerçek kurucu çıktısı kullanıldı.
- Gerçek Chromium/native süreçleriyle PC r1 ve mobil r2 karakter/kanal/dünya/HUD
  girişi geçti. Paket asset grafiği 57 dosya/140 kenar.
- Son paketle test edilen paket arasında yalnız KURULUM/DOGRULAMA metni değişti;
  bütün runtime/kurucu payload byte-byte eşit. Kanıt final-artifact-identity.json.
- Canlı VDS testi ve fiziksel telefon testi iddia edilmez; gerçek dünya boyutu
  uzaktan bilinmiyor. Başarı sonucu kullanıcı terminaliyle doğrulanmalı.

## Drive teslim bağlantısı alındı
Kullanıcı yeni Drive dosyasını gönderdi: 1JkIkonOMGUt9IlN1aS79K-_aJEo8XJ28.
Yerel teslim SHA256 tekrar doğrulandı: 95c46e794e5b7032cc22c6424634ca4dd426597738789fb1ec1e52758a2cc8aa.
Bu ortamdan Drive indirmesi HTTP 403 döndü; uzak ZIP doğrulandı denmez.
Kullanıcıya evidence/VDS_KOMUTU.txt içindeki tek blok verildi: curl -> SHA ->
--check -> --apply; hata durumunda sonraki adım çalışmaz. Canlı kurulum sonucu
bekleniyor, kurulmuş varsayılmaz.

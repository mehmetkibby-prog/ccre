# R116 devir — 14 Kasım 2026

Dal: `codex/r116-admission-transfer`. Aktif kaynak yine
`project/r109_latency_completion/working`.

Canlı Efsane salt okunur sağlık yanıtı R115_SHARED_SCOPE1 kurulu olduğunu
14 Kasımda doğruladı. R116 henüz canlıya kurulmadı. Kaynak olarak yalnız tam
R115 kabul edilir; eski ZIP/hash değerleri değiştirilmez.

Kullanıcının 13:09 UTC günlüğü: kanal 4 kurtarma sırasında
`ipc_frame_size` → booting süreç SIGKILL → tekrar deneme (2/5/10/30 saniye),
sonrasında `native_presence_owner_missing`. Stack `reliable-stream:160` →
`coordinator:248` → `coordinator-recovery:101`. Bu, ilk kesintiden sonraki
kurtarmayı bozan hatadır; ilk kesintiyi tetikleyen daha eski kayıt görüntüde yok.
16:10 Türkiye saatiyle bakım açıldığı ayrıca canlı salt okunur yanıtla görüldü;
bakımı kimin açtığına veya ilk arızanın nedeni olduğuna hükmedilmedi.

Sorun: okuyucu 4 MiB geçerli oyuncu/dünya verisi kabul ederken giriş/geri yükleme
kontrolü bunu 1 MiB tek çerçeveye sığdırmaya çalışıyordu. Yeni taşıma yalnız altı
kabul komutuna (`admit`, `admit_held`, `admit_passive`, `global_admit`,
`shared_admit`, `rebind`) uygulanır. 192 KiB parçalar, 8 MiB toplam kayıt,
32 MiB bekleyen aktarım sınırı; 1 MiB çerçeve ve 4 MiB okuyucu sınırı korunur.
Kimliği doğrulanmış özel `kernel511` ProcessStream dışında kullanılamaz.
SHA256, tam bayt sayısı, UTF-8, JSON, yöntem/kimlik ve parça sırası doğrulanmadan
eski kontrol işleyicisi çağrılmaz. Kaynak veri bir kez serileştirilir; tekrar
bağlanmada aynı işlem kimliği ve baytlar kullanılır. Büyük tekrar-deneme
parmak izleri özetlenerek 512 kayıtlık tamamlanma önbelleği de sınırlanır.

İlk adayda sonraki revoke komutunun parçalı admit'i geçebildiği testle bulundu;
teslim edilmedi. Nihai gönderici son parçayı göndermeden sonraki kontrolü
iletmez; normal sonuç/istek/commit yanıtları bekletilmez. Bu sıralama kesinti,
ACK kaybı ve başka işlemin ACK'i sırasında ayrıca doğrulandı.

Gerçek AdventureService tarafından üretilen izinli kule fikstürü
(10 dalga × 60 düşman, 8 ganimet satırı) 1.133.570 bayt oyuncu verisi verdi.
Eski giriş ve eski geri yükleme tam günlükteki hatayla yeniden üretildi.
Nihai adayda gerçek kanal SIGKILL, yeni epoch/incarnation, tekrar bağlantı,
heartbeat ve NativePresence yenileme geçti; eşya, para, ödül, malzeme ve kule
üyeliği aynı kaldı. Diğer kanallar ve dünya süreci yeniden başlamadı.
Canlıda hangi alanın veriyi büyüttüğü yalnız ekran görüntüsünden belirlenemez.

Paket: `project/r116_admission_transfer`; üç runtime dosyası. Oyuncu DB/şema,
istemci, forum, bakım/ön kayıt politikaları değiştirilmez. Efsane ve Akademi
aynı düzeltmeyi alır. Testler ve kabul `evidence/verification.json` dosyasında;
kurulum kaydı `evidence/package.json`, kullanım `KURULUM.md`.

Herhangi bir genel “sıfır lag” veya canlı kurulumu iddiası yoktur. İlk kesinti
nedeni için daha eski olay günlüğü istenmiştir. Mevcut SQLite, sahiplik,
makbuz, RNG, ödül ve yetki korumaları kaldırılmamıştır.

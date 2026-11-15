# R118 — Hükümdar Kraliyet Seti ve Şampiyonlar Diyarı

15 Kasım 2026. Aktif dal codex/r118-royal-champions. Başlangıç ff13c1a/b1e6fa8
(R117_HOOK10). Eski ZIP ve hash kimlikleri değişmez. Henüz canlı kurulum yok.

Kullanıcı kapsamı: beyaz/altın Osmanlı esintili kraliyet seti; Kadim Zümrüt'ten
ayrı dönüşüm paneli; admin tarifleri; Şampiyon >=1 kuşanma; +8% temel güç,
korunan geliştirmeler; düşük bütçeli özel parlama/duman; Haso'da 1 uygun Kadim
Zümrüt eşyayı 1 Zümrüt Tozu'na çevirme. Her eşya ve malzemeye küçük ikon.

Şampiyonlar Diyarı: yalnız şampiyon erişimi, PvP, geniş 3600x2400 alan,
4 özgün animasyonlu tür, kanal başına 48 canavar. İlk ayar kaydı realm'in
gerçek rune_v2 değerlerinden HP/hasar +12%, XP/öz +10%; admin sonra bağımsız
düzenler. Kraliyet Tacı ayarlanabilir düşüşü varsayılan %2/adet1. Diğer ganimet
oranları admin seçene kadar0; haritaya kontrolsüz genel ganimet sızmamalı.

Son kullanıcı yönlendirmesi tamamlandı: 48 sabit kimlikli canavar türleri karışık,
düzensiz konumlarda; minimum aralık 220,6 px, giriş çevresi en az 314 px boş.
Oyuncuya görünen eşya/panel adları ve teslim önizlemesi Türkçe. İngilizce enum
adları yalnız iç protokolde kalır. Giriş konumu 1800,1950.

Savaş/kimlik düzeltmesi sonrasında temel 60, native 29, captcha 20 ve
R110 kurulum 16 + çalışma 3 geçti (`evidence/required-release-checks.json`).
Son dünya aboneliği düzeltmesi üzerinde temel 60 ve native 29 yeniden geçti;
önceki captcha/R110 sonuçlarının taşındığı son raporda açıkça belirtilir.
Masaüstü/mobil Efsane/Akademi matrisi4/4 geçti; her koşuda7 akış,48 doğru
canavar kimliği,4 gerçek canavar görseli ve Türkçe adları doğrulandı. HTTP,
tarayıcı ve native hata/eksik dosya yok. Hedefli harita10/10, yeni
checkpoint/ödül7/7,192 kimlik/protokol2/2 ve iki realm ödül sertifikası6/6 geçti.

Son zorunlu test tekrarında geçici DB'nin WAL yazımı bitmeden silindiği test
kapanış hatası düzeltildi. Bir native worker ve bir captcha testinin süre aşımı
izole koşuda aynı sınırlarla geçti; kaynak değişmedi. Eski R110 arşivinin iki
realm'i aynı anda başlatırken5 saniyelik eski el sıkışma süresini aşması için
sadece testte ilk realm hazır olduktan sonra ikinci başlatılır; sonunda ikisi
ve sekiz kanal birlikte doğrulanır. Üretim süreleri ve eski arşiv değişmez.
Bütün ilk başarısız koşular ve yeni başarılı koşular ayrı saklanır.

Kurulum testinde HTTP girişinin güncel hash'i eski bileşim kanıtıyla uyuşmadı.
Eski kaynak hash'leri korunarak 10 R118 değişikliğinin ileri/geri byte eşitliğini
doğrulayan kanonik kayıt eklendi; bütünlük koruması kaldırılmadı. Yeni arşiv
oluşturuldu. Kurucunun sağlık alanı da gerçek royalReadyR118 sözleşmesiyle
eşitlendi; gerçek iki realm yanıtıyla olumlu/olumsuz regresyon testi eklendi.

Aralıklı channel_ipc_closed olayı ayrı incelendi. Tek CPU'ya bağlı yerel tanı
koşusunda gerçek 6,13 MB başlangıcın 5003/5001 ms'de reliable-stream kabul
zamanlayıcısıyla kesildiği doğrudan çağrı yığınıyla yakalandı. Supervisor20 sn
tanırken onun özel çocuk bağlantısı 5 sn bekliyordu. b4b6224 yalnız bu özel
bağlantıyı mevcut, en çok 20 sn başlangıç bütçesiyle eşitler. Varsayılan/dış
bağlantı 5 sn, kimlik/proof, sahiplik ve mesaj boyutu korumaları aynıdır.
17 deterministik yeni test ve 31 mevcut taşıma testi geçti. İlk yığın kaydı
olmayan olayın kesin nedeni geriye dönük iddia edilmez; hash hatasıyla da
karıştırılmaz. Tek CPU tanı koşusu oyuncu kapasite ölçümü değildir.

Son 50 oyuncu denemesi yeni alandaki iki gerçek entegrasyon açığını ortaya
çıkardı: normal canavarların birleşik checkpoint/ödül kabul listesi ve eski
ödül protokolünün alt çizgili yeni kimlikleri reddetmesi. Geçerli yeni alan
canavarları dar koşulla mevcut yola eklendi; yalnız yeni canavar kimlikleri
tireli biçime çevrildi. Mevcut protokol, sahiplik ve kalıcılık kontrolleri aynıdır.

Yeni kraliyet tabloları/tetikleyicilerinin güvenli ama yavaş tam ödül yoluna
neden olduğu saptandı. 6 ana +21 geçici tetikleyicinin gerçek SQL'i incelenip
27 tam SHA256 alternatifiyle tanındı. Eski R117 hash'leri ve bilinmeyen/değişmiş
tetikleyicide tam yola dönüş korunur. Test DB'sindeki eski laboratuvar
battlefield sarmalayıcısı yalnız testte tam üretim SQL'ine döndürülür; runtime
koruması gevşetilmez. Önceki yavaş ölçüm canlı kapasite ya da tek başına R118
regresyonu olarak yorumlanamaz. Başarısız ham kayıtlar saklanır.

E244 kurulu-kopya testi iki realm'in eşzamanlı açılışında ayrı bir gerçek
başlangıç yarışı yakaladı: core.register satırı online yapınca dünya süreci,
çocuk kanal henüz6,13 MB başlangıcını bitirmeden yayın gönderip5 sn yanıt
bekliyordu.6c0cf8f yalnız world-supervisor.mjs içinde kanal+incarnation
aboneliği ekler. attachChannel, gerçek kernel511-ready sonrasında ilk tam
snapshot'ı atomik olarak aynı kuyruğa ekler; sonraki yayınlar arkasından gider.
Eski abonelik hatası yenisini silemez, dünya yeniden başlarken geçerli
abonelikler kalır.5 sn normal yanıt ve20 sn başlangıç sınırı değişmedi.
Eski kodla hata yeniden üretildi;10 yeni +2 mevcut test geçti. Yeni640 adayının
büyük veriyle eşzamanlı iki realm açılışı26,17 sn'de, sekiz kanal ve0 başlangıç
hatası/kurtarma ile geçti. Handoff dahil gerçek kurulum3/3 ve her iki realm kurulu çekirdeğinde savaş/ödül
akışı geçti. Güncel640 temel60/native29 testleri de geçti. Önceki captcha20
ve değişmeyen R11016+3 kanıtı açık kapsam notuyla taşınır; güncel arşivde gerçek
captcha ayrıca doğrulandı. Son kanıt required-projection-release-checks.json.
Kullanıcının süre/kredi sınırı nedeniyle son yük ölçümü birer 50 oyunculu
orman/Şampiyonlar Diyarı sabit savaş koşusuna daraltıldı; üç tekrar veya
canlı kapasite onayı iddia edilmez. Ölçüm sonuç dosyası nihai kanıttır.
Kanıt: evidence/world-ready-subscription.json.

Staged savaş testi de özel beceriyi750 ms arayla iki kez seçiyordu; ilk özel
vuruşun RNG nedeniyle biraz can bırakması12 sn bekleme kuralını ihlal ediyordu.
b5ac5d7 yalnız testte özel beceriyi bir kez kullanıp normal saldırılarla bitirir,
sunucunun nextAttackAtMs bilgisini izler. Oyun koruması veya RNG değişmez.
Başarısız eski koşu korunur; düzeltme ile her iki kurulu realm
üzerinde kalıcı ölüm, tekrar talep ve1 taç+3 öz toplama geçti.

Mevcut aday SHA256:
640cf76b08b9d072db55d88cd8b8d539fb74b442cb26e78d3a437b5b37422fd7.
114 dosya, namespace core511-c4d0f4d061896a4e. Kurucu13/13, geçiş9/9 geçti.
Bu adayın kurulu-kopya kontrolleri geçti; 50 oyunculuk yük doğrulaması
geçerli sonuç veremedi ve kullanıcı süre sınırıyla durduruldu.
`evidence/package.json` nihai durumun kaynağıdır. Son zorunlu test kayıtları
`evidence/required-projection-release-checks.json` içindedir; önceki başarısız grupların
kayıtları aynı dosyadan bağlantılanır ve korunur.

Temiz Canvas ölçümü her modda üç tekrar: temel/tam/az efekt p95 medyanı
0,5/2,1/1,9 ms. Tam efektte bir >50 ms kare aralığı görüldü; diğerlerinde0.
Bu yalnız headless çizim ölçümüdür, canlı FPS veya sıfır gecikme sözü değildir.
50 oyuncu ölçümleri aynı makinede sentetik DB ve 4 CPU kotasıyla yapılır;
canlı 8 çekirdek/12 GB ortamının kapasite garantisi değildir.

Korumalar: hesap/şampiyon sunucu doğrulama, tek sefer makbuz, atomik malzeme
tüketimi, sahiplik, eşya satış/kuşanma kilitleri. Kalıcı ek tablolar ve yeni
alandaki oyuncu konumu nedeniyle kurucu veri geçişini kod-only sayamaz.


Nihai kapsam: özellik/kurulum kabulü geçti; yük doğrulaması geçerli sonuç
üretmedi. Son sentetik giriş kurulumu hp=0/max_hp=100 ile ölçümden önce durdu;
oyun süreci hatası/kopma kaydedilmedi. Bu, 50 oyuncunun başarıyla ölçüldüğü
anlamına gelmez. Kullanıcının süre/kredi sınırıyla ek test düzeneği denemeleri
durduruldu. `evidence/load-validation.json` ve `evidence/package.json` esas:
acceptance=functional-passed-load-validation-unavailable. Yeni ZIP640 kimliği
korunur; canlı kapasite, üç tekrar medyanı veya sıfır takılma iddiası yoktur.

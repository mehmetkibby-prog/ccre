# Core of Life R80 çalışma paketi

R79_GAMEPLAY üzerine yerinde güncelleme: genel bakımın hızlı ödül tekrarlarıyla gereksiz çoğalmasını azaltır, checkpoint işçisine kontrollü toparlanma ekler ve ana döngü/CPU/kayıt bekleme ölçülerini ayırır.

- Kurulabilir dosya: CORE511_R80_TOPLU.zip
- Kurulum ve kurtarma: [KURULUM.md](KURULUM.md)
- Teknik kapsam ve açık kalanlar: [SONUC.md](SONUC.md)
- Tek metin dosyası: [CORE511_R80_NOTLAR.txt](CORE511_R80_NOTLAR.txt)
- Test ve kaynak kimlikleri: [r80-tests/R80_KANIT.json](r80-tests/R80_KANIT.json)
- Kurucunun kaynakları ve altı dosyalık delta: r80-package/
- Salt okunur ölçüm ve eksik kaynak dışa aktarıcısı: r80-tools/

Bu çalışma canlı VDS'ye otomatik kurulmaz. Tam sunucu açılışı ve canlı ortamda 10–30 oyuncu denemesi yapılmış sayılmıyor. Boss/Sinsi ön plan hold daraltma taslağı drafts/foreground/ içinde saklanır ve kurulum payload'ına dahil değildir; güncel kaynak bağımlılıkları sağlanınca tamamlanabilir.

## Geliştirme doğrulamasını yeniden çalıştırma

Python installer testleri r80-package kaynaklarını kullanır. Oyun testleri r79-audit/ ve r80-work/ konumlarında SHA ile eşleşen R79 tabanı ve bunun üzerine altı onaylanan payload dosyasını bekler; Node22.23.4 R79 paketindeki runtime'dır. Bu dal tam canlı oyun kaynağının yerine geçmez. Eksik kaynak listesi ve seçici dışa aktarıcı birlikte verilir. Farklı hashli eski modüllerle test boşluklarını doldurmayın.

Foreground taslağının 17 geçen ve 8 bekleyen testi, aktif paketin testleriyle toplanmamalıdır. Ham TAP/JSON kanıtları test kapsamını ve canlı ölçüm olmadığını belirtir.


Paket kimliği
Dosya: CORE511_R80_TOPLU.zip
Boyut: 165,075 byte
SHA-256: 21a3b001edd4adc2f2bca5734efb6d9cc937e3c005214047d383c3e14e98ed54

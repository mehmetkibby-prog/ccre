# R109 doğrulama kapsamı

Davranış, paket güvenliği ve performans ayrı değerlendirilir. Kesin geçen
kontroller ve ham kanıt yolları PERFORMANS_RAPORU.md ile evidence/release-validation.json
kaydında listelenir; burada test planı tanımlanır.

- Eski/yeni oda kontrolü: ölüm, sahiplik değişimi, kat geçişi, mühür, Azrail,
  zaman aşımı, bekleyen işlemler, programlı açılış ve temizleme kararları.
- Gerçek native kurallarla kule/Sis Yarığı, Solo Zindan ve ganimet/ödül hakları.
- Ortak boss: dört kanalın aynı boss’a katkısı, gerçek ölüm/XP/ganimet hakları;
  aynı turda tek sonuç kaydı ve her oyuncunun ödülünün korunması.
- Eşyalı karakterler: üç sınıf, uzmanlık skilleri, pet/kanat, çanta ve kalıcı
  silah öldürme sayaçları; kanal başına gerçek oyuncu kapasitesi.
- Normal haritalar, kule, Solo ve Sis Yarığı aynı yükte; sohbet, iksir ve
  lonca/görev/pazar ekranı HTTP istekleri. Botlar ayrı süreçte.
- Eşyalı 30/40 oyuncu; 40 kişilik yoğun kanal ve ortak boss senaryosunda tekrar. Olumsuz ve tanı amaçlı ölçümler ayrı tutulur.
- İki kaynak sürümden gerçek dosya kurulumu, yarım yazma/sağlık hatasında geri
  dönüş, oyuncu ilerlemesinin korunması ve tek önceki kod yedeği.
- Dağıtılan dosyalarla iki realm ve sekiz gerçek kanal; exact JS/CSS grafiği,
  Efsane PC ve Akademi mobil karakter/kanal/oyun girişleri.

Canlı veritabanı veya üretim kabuğu kullanılmadı. Veri sentetiktir; makine
4 çekirdek kotası paylaşır. Ağ gecikmesi ve oyuncu cihazının grafik FPS'i bu
sunucu yük testinin ölçtüğü değerler değildir.

R109 ek kontrolleri: önbellek bağlamı/şema/rollback, boss sorgu kimliği ve sınırlı ömrü, küçük saldırı gruplarında sıra/sahiplik ve tüketilmeyen kuyruk başları.

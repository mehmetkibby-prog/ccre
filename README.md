# R118 — Hükümdar Kraliyet ve Şampiyonlar Diyarı

Efsane ve Akademi için; yalnız tam **R117_HOOK10** sürümünün üzerine kurulur.
Bu depodaki dosya canlıya otomatik kurulum yapmaz.

## İçerik

- Beyaz ve altın Osmanlı esintili Hükümdar Kraliyet Seti, sınıflara özel silahlar,
  küçük eşya simgeleri ve sınırlı parlama/duman efekti.
- Ayrı Kraliyet Ustası: Kadim Zümrüt eşyayı dönüştürür. Efsun, taş, artı seviyesi,
  Sonsuz geçmişi ve eşyanın kimliği korunur; temel güç yaklaşık %8 artar.
- Yalnız Şampiyon Lv 1 ve üzeri Kraliyet eşyasını kuşanabilir.
- Demirci Haso: uygun, kuşanılmamış bir Kadim Zümrüt eşya karşılığında bir Zümrüt Tozu.
- Her parça için admin tarafından değiştirilebilen malzemeler ve miktarlar.
  İlk tarif: 8 Zümrüt Tozu + 1 Kraliyet Tacı + 5.000 mücevher.
- Şampiyonlar Diyarı: Şampiyonlara özel büyük PvP haritası; kanal başına 48
  canavar, dört animasyonlu tür. Türler karışık ve dağınıktır; sıralı diziliş yoktur.
- Can, hasar, tecrübe, öz ve ganimetler admin panelinden ayrı ayrı ayarlanır.
  İlk Kraliyet Tacı düşüş oranı %2'dir; diğer eşya düşüşleri admin seçene kadar kapalıdır.
- Yeni panel ve eşya adları Türkçedir. Efsane ve Akademi'nin bakım/ön kayıt ayarları korunur.

## Nereden açılır?

- Oyuncu: **Işınlanma → Av Bölgeleri → Şampiyonlar Diyarı**.
- Dönüşüm: Pazar Köyü'ndeki **Kraliyet Ustası**; şehir menüsünden de açılabilir.
- Yönetici: **Eşya ve gelişim → Kraliyet Eşyaları**.
- Harita ayarları: **Haritalar ve savaş → Şampiyonlar Diyarı**.

## Görseller

- [Set, simgeler ve canavarlar](kraliyet-gorselleri.jpg)
- [Oyundaki dağınık canavar yerleşimi](sampiyonlar-diyari.png)
- [Mobil dönüşüm ekranı](kraliyet-paneli-mobil.png)

## İndir ve kur

- [Düzeltilmiş R118 güncelleme paketi](r118-duzeltilmis.zip)
- [Kurulum adımları](KURULUM.md)
- [Dosya doğrulama değerleri](SHA256SUMS)

Paket SHA256: `8a41b77d3cc136729468f0951ce651da56a01d8b71852b730de8e7f26c3c78e5`.

İlk paketin ön kontrolünü durduran, yalnız testlerde kullanılan dosya dağıtım
kapsamından çıkarıldı. Oyun kodu, içerik ve veri geçişi aynı; üretim dosyası
bütünlük kontrolleri korunuyor. Eski `r118.zip` arşiv amaçlı tutuluyor; yeni
kurulumda yukarıdaki düzeltilmiş dosya kullanılmalı.

## Doğrulama kapsamı

Kurulum düzeltmesi: farklı veya eksik test dosyasıyla kurulum/geri dönüş ve
üretim dosyası değişikliğini reddetme kontrolleri geçti. Yeni ZIP
kurulduktan sonra iki dünya/sekiz kanal, captcha ve WebSocket testleri 3/3
geçti; test dosyası bu başlangıçta hiç yoktu. Oyun içeriğine ait önceki
sonuçlar, kalan 113 dosyanın birebir aynı olduğu doğrulanarak korunur.

Efsane/Akademi masaüstü ve mobil akışları 4/4 geçti: dönüşüm, Haso, yeni alana
giriş/savaş/dönüş ve yönetici ayarları. Son ZIP'ten kurulan iki sunucu, sekiz
kanal, güvenlik kodu üretimi ve WebSocket devri doğrulandı. İki kurulu çekirdekte
kalıcı canavar ölümü, taç/öz toplama ve tekrar istekte ikinci ödül verilmemesi
geçti. Son kaynakta 60 temel ve 29 sunucu kontrolü başarılıdır.

**50 oyunculuk yük doğrulaması için geçerli sonuç alınamadı.** Sentetik bot
kurulumundaki konum/can sorunları nedeniyle bu denemeler kapasite veya gecikme
kanıtı sayılmadı. Bu paket için kalabalıkta performans veya sıfır takılma
garantisi verilmez. Önceki başarısız denemeler kaynak dalında korunur.

Bu dosyalar burada canlı sunucuya kurulmadı.

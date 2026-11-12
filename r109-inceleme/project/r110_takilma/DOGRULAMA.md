# R110 doğrulama kapsamı

Davranış, paket güvenliği ve performans ayrı değerlendirilir. Ham kanıtlar
`r109-inceleme/measurements/r110-aday/` ve `project/r110_takilma/evidence/`
altındadır.

- Oyun motoru: odaklı 56/56 (R109'un 54 testi + 2 yeni soket devretme yarış
  testi), native 29/29 (zindan, kanal, ticaret/depo, kule süreci, kontrol
  noktası sahipliği), captcha 20/20.
- İlk çerçeve kaybı yarışı: kanal meşgulken gönderilen ilk istemci baytları
  kanal sürecine ulaşır; `readStop` satırı silinince test kırılır.
- Kurulu `runtime-entry` ile iki realm ve sekiz gerçek kanal: yanlış vekil
  anahtarı reddedilir; her kanalda ilk çerçeve 4–6 ms'de yanıtlanır; `/proc`
  tablolarına göre soket kanal sürecine aittir; 24 soketlik yeniden bağlanma
  patlaması tamamlanır; açık devredilmiş soket varken kapanış temizdir.
  `CORE511_R110_WS_HANDOFF=0` ile R109 aktarımı aynen çalışır.
- Gerçek Chromium: Efsane PC ve Akademi mobil, kule akışı kaybı, kat 1→2,
  F5 olmadan kurtarma, kalıcı saldırının tekrar oynatılmaması.
- Yük testleri: normal haritalar, Kadim Kule, Solo Zindan, Sis Yarığı, Kara/Rün
  ve ortak boss; 10/40/50/100 oyuncu; r1 4×25 ve r2 4×10 kabul sınırı açık.
  Ödül/ÇP/eşya ve boss tek-sefer makbuz denetimleri bütün koşularda geçti.
- Kurucu: gerçek dosyalarla R109 → R110 kurulumu ve R109'a geri dönüş, sağlık
  hatasında otomatik geri dönüş ve oyuncu ilerlemesinin korunması, yarım
  yazma, yedek sırasında elektrik kesintisi, değişmiş kurulu dosya, yalnız
  R109 kaynağının kabulü, tek önceki kod yedeğinin tutulması ve yabancı
  dosyaların korunması. Kurulum sonrası ağaç kurulu `runtime-entry` ile ayrıca
  başlatıldı.

Canlı veritabanı veya üretim kabuğu kullanılmadı. Veri sentetiktir; makine
4 vCPU'dur. Ağ gecikmesi, host CPU çalması ve oyuncu cihazının grafik FPS'i bu
sunucu yük testinin ölçtüğü değerler değildir.

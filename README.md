# Core of Life — R89

Güncel düzeltme dalı: `r89-codex-stability`. Rün Sahili ve hareket/kayıt yığılması düzeltmeleri tamamlandı; sonuçlar [R89 raporunda](r89_stability_work/SONUC.md). Kurucu doğrudan kurulu **R86** üzerine uygulanır. Bu depoya gönderme canlı VDS kurulumu değildir.

- [Kurulum ve geri alma](r89_stability_work/KURULUM.md)
- [İndirilebilir R89 paketi](https://github.com/mehmetkibby-prog/ccre/tree/r89-download)
- [Ölçüm ve doğrulama kanıtı](r89_stability_work/evidence/final-release-gate-r89.json)

Üretim kaynakları geçmişten gelen `r87_stability_work/working/` yolunda güncellenmiştir. `r89_stability_work/working` bu dizine göreli bağlantıdır. R88 dalı korunur; R85/R86 dizinleri karşılaştırma kaynaklarıdır.

Bu dal için `python3 tools/verify_r89.py` çalıştırın. Eski `HANDOFF_MANIFEST.json`, `DEVIR_R87.md`, `CLAUDE_BASLANGIC.md` ve `tools/verify_snapshot.py` durdurulan R87 devrinin tarihsel kayıtlarıdır; R89 kurulum talimatı veya R89 dosya manifesti değildir.

Yerel yeniden üretim: [CALISTIRMA.md](CALISTIRMA.md) içindeki sabit yol/Node/bağımlılık hazırlığı geçerlidir; güncel dalı klonlayın. Ardından `python3 r89_stability_work/verify_final.py` izole native yük/doğruluk/kurucu testlerini sıralı çalıştırır. Bu komut ölçüm dosyalarını yeniden yazar; önce mevcut kanıtları koruyun. Süreç çalışırken üretim kaynaklarını değiştirmeyin veya aynı makinede başka yük testi başlatmayın.

50 oyunculu ölçümler iki kanalda 25'er oyuncuyla, gerçek sunucu ve TCP/WebSocket taşımasıyla yapılır. Çizim yapan 50 tarayıcı, canlı VDS, WAN ve bütün harita/etkinlik birleşimleri kapsam dahilinde değildir. `fullGameAcceptance: false` korunur. Canlı veritabanı, hesaplar, özel anahtarlar ve erişim bilgileri bu güncellemeye eklenmez.

# Core of Life — R90

Güncel dal: `r90-verification-room`. R90, kule/zindan/Sis Yarığı içinde eski doğrulamanın savaşı kesmesini düzeltir. R89 üzerine uygulanır; canlı VDS kurulumu yapılmadı.

- [Düzeltme ve test raporu](r90_stability_work/SONUC.md)
- [Kurulum ve geri alma](r90_stability_work/KURULUM.md)
- [İndirme dalı](https://github.com/mehmetkibby-prog/ccre/tree/r90-download)

Üretim kaynakları `r87_stability_work/working/` yolundadır; `r90_stability_work/working` bu dizine göreli bağlantıdır. Bu dalı `python3 tools/verify_r90.py` ile doğrulayın. R89 ve R88 dalları kendi kaynak/kanıtlarıyla korunur. Bu daldaki eski R87/R89 manifestleri güncel R90 kimliği değildir.

R90 testleri yereldir: 15 hedefli davranış/uyumluluk ve 10 kurulum kontrolü geçti. Yeni 50 oyuncu yük testi veya canlı test yapılmadı. Oyuncu veritabanı, hesap verisi ve gizli erişim bilgileri bu pakette yoktur. Değişiklikler 7 sunucu dosyasıyla sınırlıdır.

Yeniden üretim için `CALISTIRMA.md` içindeki Node/bağımlılık ve yerel test ortamı hazırlığı geçerlidir. Paket hazırlama betikleri özgün çalışma alanındaki doğrulanmış R89 ve R86 arşivlerini ister; bunların yerini rastgele bir tabanla değiştirmeyin. R90 davranış testlerini `R85_RUNTIME_TREE=<R90 çalışma ağacı> python3 r90_stability_work/tests/run.py --test r90_stability_work/tests/verification-room.test.mjs r90_stability_work/tests/verification-room-process.test.mjs` ile çalıştırın.

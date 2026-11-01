# Claude Code'a başlangıç görevi

Bu depoda Core of Life oyununun durdurulmuş R87 çalışması bulunuyor. Önce README.md, DEVIR_R87.md ve CALISTIRMA.md dosyalarını oku. Güncel oyun kodu r87_stability_work/working içinde; R86 canlıya kurulmuş son sürüm. R87'yi hazır paket sanma ve doğrudan canlıya kurma.

Kullanıcının hedefi 8 çekirdek/8 GB sunucuda 50 eşzamanlı oyuncunun rahat oynaması. Oyuncu ekrana girince, canavar keserken ve ödül alırken takılmalar bildiriliyor. Özellikle 65 seviye Rün Sahili'nde öldürme/ödül sırasında küçük takılma var. İki ayrı tarayıcıdan bakıldığında diğer oyuncunun hareketi de akıcı olmalı. Normal haritalar, Rün Sahili, Sis Yarığı, solo/grup zindan, Kadim Kulesi ve Etkinlik Adası kapsamını değerlendir.

Kullanıcı gerekli mimari değişiklikleri yapma yetkisi verdi. Buna karşılık kayıtlı oyuncu ilerlemesi, eşya/para/ödül doğruluğu ve güvenli kurulum/geri alma korunmalı. Mevcut tasarım kararlarını sorgulayabilirsin; veri kaybını veya hareket donmasını gizlemek için doğruluk kontrollerini kaldırma. Kullanıcı kredi ve süre konusunda hassas: tekrarlayan gereksiz testlerden kaçın; değiştirdiğin gerçek riski ölç.

Önce mevcut R87 farkını ve başarısız performans kanıtlarını incele. 50 oyunculu testte `passed: true` tek başına başarı değildir. Donmaya işaret eden prediction-limit/komut kuyruğu/ödül beklemesi devam ediyor. Native test ile gerçek tarayıcı görüntü akıcılığını ayır. Yerel ölçümü canlı VDS sonucu gibi sunma.

İşi bitirdiğinde değişiklikleri yeni bir Git dalına commit et, hangi sorunların düzeldiğini ve hangilerinin doğrulanamadığını açıkça yaz, yeniden çalıştırılabilir test sonuçları ver. R86 üzerine güvenli güncelleme ZIP'i gerekiyorsa istemci grafiği ve kaynak SHA zincirini dikkate al; R86 kurucusu sunucu değişikliğiyle sınırlı olduğundan R87 için aynen kopyalanamaz. Sonuçları ve commit kimliğini kullanıcıya geri ver ki Codex kaldığı yerden devralabilsin.

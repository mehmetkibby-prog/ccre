# Core of Life — Claude Code için R87 geliştirme devri

**Çalışma kullanıcının isteğiyle durduruldu. R86 canlıda kurulu; R87 tamamlanmamış adaydır. Bu dal bir kurulum paketi değildir.**

1. [DEVIR_R87.md](DEVIR_R87.md): mevcut değişiklikler, ölçümler, kalan işler ve mimari.
2. [CALISTIRMA.md](CALISTIRMA.md): yerel test ortamını kurma ve çalıştırma.
3. [CLAUDE_BASLANGIC.md](CLAUDE_BASLANGIC.md): Claude Code'a verilecek görev.

Güncel çalışma ağacı: **`r87_stability_work/working/`**. R85 ve R86 dizinleri karşılaştırma içindir; bunları güncel kod sanmayın. R87 kaynakları durdurma anındaki haliyle korunmuştur. Devir araçları dışında yeni oyun değişikliği yapılmamıştır.

İçerik: oyun çekirdeği, kanal/dünya/yazıcı süreçleri, native kurallar ve şema, derlenmiş HTTP ve istemci JavaScript'i, R85/R86 karşılaştırma kaynakları, testler, CPU/SQL profilleri, başarılı ve başarısız ölçümler, önceki kurulum/geri alma araçları ve gerekli test bağımlılıkları.

Canlı hesap/veritabanı, `.env`, özel anahtarlar, sunucu kimlik bilgileri ve büyük statik medya arşivi dahil değildir. Derlenmiş istemci ve native kaynak vardır; bu depo tüm tasarım kaynakları ve medya dosyalarıyla sıfırdan kurulabilen bir web sitesi dağıtımı değildir. Lag araştırması için gereken mevcut çalışma kaynakları ve yerel veri üreten testler dahil edilmiştir.

**50 oyuncu için tam kabul verilmedi.** Son 180 saniyelik koşuda 58.566 komut, p99 131,73 ms; buna rağmen 4 prediction-limit olayı ve 5 sınırlanan kare kaldı. JSON'daki `passed: true` ekonomi/taşıma doğruluğudur; bütün oyunun akıcılık kabulü değildir. `fullGameAcceptance: false` değerini dikkate alın.

`HANDOFF_MANIFEST.json` dosya boyutlarını ve SHA-256 değerlerini içerir. İlk incelemede `python3 tools/verify_snapshot.py` çalıştırın. GitHub dalı: `r87-claude-handoff`. Var olan yayın dalları değiştirilmedi.

# Core of Life — R109 inceleme ve geliştirme

**Güncel oyun: R109_LATENCY2.** Bu dal, Claude'un performans sorunlarını araştırıp
kod üzerinde düzeltme yapabilmesi için hazırlandı. Canlı sunucuda değişiklik yapmaz.

1. [Claude başlangıç yönergesi](CLAUDE.md)
2. [Kaynak, kurulum ve test komutları](r109-inceleme/README.md)
3. [Güncel oyun kodu](r109-inceleme/project/r109_latency_completion/working)
4. [Bilinen sorunlar ve ölçüm sınırları](r109-inceleme/docs/KNOWN_ISSUES.md)
5. [Altı oyunculu son canlı CPU profili](r109-inceleme/measurements/live-r109)

Klasörde sunucu/istemci/admin/hesap kodları, SQL şemaları, testler, sentetik yük
üreticisi, kurucu/geri dönüş kodu, görseller, kaynak kimlikleri ve olumsuz sonuçlar
dahil ölçümler var. Oyuncu veritabanı, gerçek hesap bilgileri ve canlı anahtarlar yok.

Eski kaynaklar yalnız karşılaştırma ve test referansıdır. R110/R111 raporları
`measurements/not-installed` altında; bu sürümlerin kodu güncel oyuna karıştırılmadı.

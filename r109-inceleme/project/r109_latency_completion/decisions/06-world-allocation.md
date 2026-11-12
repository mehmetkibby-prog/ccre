# 6 — Küçük yazma grupları ve gereksiz nesneler

drainWrites'ın inclusive süresi bütün iç işlerin toplamıdır; tek büyük işlem
veya GC'nin o fonksiyondan kaynaklandığı anlamına gelmez. Kod zaten en fazla8
iş ve8 ms çalışma bütçesi kullanır, gruplar arasında event loop'a döner.
Tek bir mantıksal ödül/transaction'ı ortasından bölmek uygulanmadı.

Somut gereksiz iş: her bağımsız yazmada, dünya değişmese de world_state
tam satırı okunuyor, kopyalanıyor ve eski/yeni iki JSON karşılaştırılıyordu.
Yeni yol aynı transaction içinde tetikleyicinin revision sayısını okur;
değişmediyse yalnız önceden fsync edilmiş immutable dünya görüntüsünü kullanır.
Yeni revision, tam satır okuması ve mevcut fsync sonrası yayın yolunu korur.
Market/lonca zaten yalnız revision kontrol ettiği için değiştirilmedi.

Test:20 alakasız yazmada tam dünya okuması20→0; değişen dünya, geri alma,
geciken fsync, araya giren başka transaction ve dış değişim kontrol edilir.

Şema ana sürümü de kontrol edilir; başlangıçtan sonra DDL olmuşsa eski tam
okuma yolu kullanılır. Aynı revision altında satır biçimi değişimi eski
world_point_reused korumasına takılır. Bu test de geçti.

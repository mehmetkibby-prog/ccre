# 9 — Retaliation sorgu planları

Gerçek şema üzerinde EXPLAIN QUERY PLAN testi geçti. players.id ve
monsters.id PK indeksi; pve_engagements.player_id PK indeksi;
player_items oyuncu/equipped indeksiyle aranıyor. Loadlab alt sorguları da
mevcut indeksleri kullanıyor. json_each taraması yalnız bounded canavar ID
listesidir; bütün canavar tablosunun taranması değildir.

Bu nedenle ek/mükerrer indeks ve canlı şema göçü yapılmadı. Ham sorgular ve
planlar evidence/retaliation-query-plans.json içinde; regresyon testi mevcut
indekslerin kullanılmasını denetler. Profilde retaliation-writer.prepare
adı D1 uyarlayıcısındaki başka ödül sorgularını da kapsar; tek başına yavaş
retaliation tablosu kanıtı değildir.

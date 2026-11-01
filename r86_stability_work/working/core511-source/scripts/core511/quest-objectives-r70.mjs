const type=(id,label,group,max,help)=>Object.freeze({id,label,group,max,help});
export const QUEST_EVENTS438=Object.freeze([
 type('kill','Normal canavar yen','Av ve keşif',100000,'Önceki görevin ödülünden sonra yenilen normal canavarlar sayılır.'),
 type('fish','Balıkçılıkta bir şey yakala','Av ve keşif',100000,'Önceki görevin ödülünden sonraki başarılı avlar sayılır.'),
 type('market','Pazar öğretisini oku','Tanışma',1,'Oyuncu Pazar Alanı’nda öğretimi onaylar.'),
 type('evolution','İlk silah evrimini yap','Gelişim',1,'Karakterin tamamlanmış ilk evrimi sayılır.'),
 type('level','Karakter seviyesine ulaş','Gelişim',65,'Karakterin mevcut seviyesi; daha önce ulaştığı seviye de geçerlidir.'),
 type('rank','Rütbe kademesine ulaş','Gelişim',18,'Karakterin mevcut rütbe kademesi.'),
 type('skill','Bir yeteneği geliştir','Gelişim',10,'Üç ana yeteneğin en yüksek mevcut seviyesi.'),
 type('gear_upgrade','Artı basılmış ekipman edin','Ekipman',5,'Çantada veya kuşanılmış bir ekipmanın en yüksek + seviyesi.'),
 type('gear_evolution','Evrimleşmiş silah edin','Ekipman',3,'Sahip olunan silahların en yüksek evrim seviyesi.'),
 type('equipped','Ekipman kuşan','Ekipman',7,'Silah, zırh, başlık, ayakkabı ve üç takı yuvasının dolu olanları.'),
 type('pet','Aktif bir yoldaş edin','Yoldaş ve topluluk',1,'Süresi dolmamış bir yoldaşa sahip olmak yeterlidir.'),
 type('mount','Bir binek aç','Yoldaş ve topluluk',1,'Kalıcı olarak açılmış en az bir binek gerekir.'),
 type('guild','Bir loncaya katıl','Yoldaş ve topluluk',1,'Karakterin mevcut lonca üyeliği kontrol edilir.'),
 type('party','Bir gruba katıl','Yoldaş ve topluluk',1,'Karakterin en az iki üyeli bir grupta olması gerekir.'),
 type('mist_chest','Sis Sandığı aç','Seferler',100000,'Karakterin toplam açtığı normal ve altın Sis sandıkları sayılır.'),
 type('gold_mist_chest','Altın Sis Sandığı aç','Seferler',100000,'Karakterin toplam açtığı Altın Sis sandıkları sayılır.'),
 type('azrail','Kadim Kulesi’nde Azrail’i yen','Seferler',100000,'Azrail zafer ödülünü kazandığın seferlerin toplamı sayılır.')
]);

export const questMetaR70=id=>QUEST_EVENTS438.find(e=>e.id===id);

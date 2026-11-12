import {EXTRA_PRODUCTS} from './extra-products.mjs';
export const SUPPORT_DURATION_DAYS = 5;
export const SUPPORT_VENDOR_LINKS={
 sonteklif:'https://www.sonteklif.com/oyuncu-pazari/detay/yasam-cekirdegi-400-tl-destek-paketi-515645',
 itemci:'https://itemci.com/product/coreoflife-ep/coreoflife-400-ep-6aaefad00c0f8',
};
export const COIN_VENDOR_LINKS={3000:{"sonteklif":"https://www.sonteklif.com/oyuncu-pazari/detay/yasam-cekirdegi-3000-cekirdek-parasi-1500-tl-535926","itemci":"https://itemci.com/product/coreoflife-ep/coreoflife-3000-ep-6ac7b3911f82d"},
 200:{sonteklif:'https://www.sonteklif.com/oyuncu-pazari/detay/yasam-cekirdegi-200-cekirdek-parasi-150-tl-524221',itemci:'https://itemci.com/product/coreoflife-ep/coreoflife-200-ep-6aaac46703f27'},
 500:{sonteklif:'https://www.sonteklif.com/oyuncu-pazari/detay/yasam-cekirdegi-500-cekirdek-parasi-300-tl-520009',itemci:'https://itemci.com/product/coreoflife-ep/coreoflife-500-ep-6aaac4a87b133'},
 1000:{sonteklif:'https://www.sonteklif.com/oyuncu-pazari/detay/yasam-cekirdegi-1000-cekirdek-parasi-550-tl-524219',itemci:'https://itemci.com/product/coreoflife-ep/coreoflife-1000-ep-6ab0445b68497'},
};
export const COIN_PACKS = [
 {code:'core-coins-200-v1',name:'200 Çekirdek Parası',coins:200,priceTl:150},
 {code:'core-coins-500-v1',name:'500 Çekirdek Parası',coins:500,priceTl:300},
 {code:'core-coins-1000-v1',name:'1000 Çekirdek Parası',coins:1000,priceTl:550},{code:"core-coins-3000-v1",name:"3000 Çekirdek Parası",coins:3000,priceTl:1500},
];
export const COSTUMES={
 muhafiz:{name:'Zümrüt Hükümdar',image:'/game/costume-muhafiz.webp'},
 avci:{name:'Ormanın Tacı',image:'/game/costume-avci.webp'},
 arkanist:{name:'Yıldız Dokuyucu',image:'/game/costume-arkanist.webp'},
};
export const PREMIUM_ITEMS={trade_glass499:{"name":"Ticaret Camı","price":100,"image":"/game/trade-glass499.webp","shopOnly499":true},pumpkin_knight499:{"name":"Bal Kabağı Şövalyesi Seti","price":250,"shopOnly499":true,"image":"/game/pumpkin-knight-icon499.webp","description":"7 günlük zırh ve sınıfa uygun silah görünümü. Toplam +1000 Can, +20 saldırı, canavarlara karşı %10 güç ve %25 canavar tecrübesi. Süre satın alınca başlar; çevrimdışıyken de ilerler. Çantadan kuşanılır."},"cp_coupon_100":{"name":"100 ÇP Kuponu","price":110,"faceValue":100,"image":"/game/cp-coupon-100-v483.svg"},"cp_coupon_200":{"name":"200 ÇP Kuponu","price":220,"faceValue":200,"image":"/game/cp-coupon-200-v483.svg"},"cp_coupon_500":{"name":"500 ÇP Kuponu","price":550,"faceValue":500,"image":"/game/cp-coupon-500-v483.svg"},...EXTRA_PRODUCTS,afk_ticket:{name:'Oto Av +2 Saat',price:200,image:'/game/afk-ticket-v350.webp'},enchant_add:{name:"Efsun Artırma Nesnesi",price:35,image:"/game/enchant-add-v262.webp"},wings:{name:'Kızıl Çekirdek Kanatları',price:500},xp_ring:{name:'Tecrübe Yüzüğü',price:150},drop_charm:{name:'Ganimet Tılsımı',price:150},item_link:{name:'Eşya Yansıtma',price:1,image:'/game/item-reflection-v250.webp'},enchant_scroll:{name:'Efsun Değiştirme Parşömeni',price:25,image:'/game/enchant-change.webp'},auto_potion:{name:'Oto Kırmızı İksir',price:100,image:'/game/auto-red-potion.webp'},costume:{name:'Sınıf Giysisi',price:200},stall_skin:{name:'Zümrüt Pazar Tezgâhı',price:75,image:'/game/premium-stall.webp'},teleport_skin:{name:'Zümrüt Geçidi',price:75,image:'/game/teleport-seal-v250.webp'},weapon_skin:{name:'Zümrüt Hükümran Silahı',price:150,image:'/game/premium-weapons.webp'},storage_page:{name:'Ek Depo Sayfası',price:100},rename_scroll:{name:'İsim Değiştirme',price:50,image:'/game/rename-scroll-v250.webp'}};
export const COSTUME_BONUS={hp:500,defense:50,xpMultiplier:1.2};
export function costumeEquipped(items){return items.some(i=>i.kind==='costume'&&i.equipped===1);}

export const EXTRA_STORAGE_SLOTS=24;
export const MAX_EXTRA_STORAGE_PAGES=4;

// One shared, versioned odds table for the authoritative draw and its disclosure.
export const WHEEL_PRICE=15;
export const WHEEL_VERSION='wheel-v4';
export const WHEEL_REWARDS=[
 {id:'pearl',name:'Beyaz İnci',short:'İnci',amount:1,weight:20,icon:'pearl'},
 {id:'potion_3',name:'3 Kırmızı İksir',short:'İksir ×3',amount:3,weight:120,icon:'potion'},
 {id:'essence_20',name:'20 Yaşam Özü',short:'Öz ×20',amount:20,weight:250,icon:'essence'},
 {id:'bird',name:'Kuş Peti · 7 gün',short:'Kuş Peti',amount:1,weight:10,icon:'bird'},
 {id:'potion_2',name:'2 Kırmızı İksir',short:'İksir ×2',amount:2,weight:170,icon:'potion'},
 {id:'enchant_scroll',name:'Efsun Değiştirme Nesnesi',short:'Efsun',amount:1,weight:30,icon:'enchant'},
 {id:'essence_50',name:'50 Yaşam Özü',short:'Öz ×50',amount:50,weight:150,icon:'essence'},
 {id:'potion_1',name:'1 Kırmızı İksir',short:'İksir ×1',amount:1,weight:194,icon:'potion'},
 {id:'afk_ticket',name:'Oto Av Bileti · +2 saat',short:'Oto Av',amount:1,weight:5,icon:'afk'},
 {id:'auto_potion',name:'Oto Kırmızı İksir',short:'Oto İksir',amount:1,weight:10,icon:'auto'},
 {id:'gems_50',name:'50 Mücevher',short:'Mücevher ×50',amount:50,weight:40,icon:'gems'},
 {id:'wings_3d',name:'Kızıl Çekirdek Kanatları · 7 gün',short:'Kanat',amount:1,weight:1,icon:'wings'},
];
export function wheelRewardAt(ticket){
 const total=WHEEL_REWARDS.reduce((n,r)=>n+r.weight,0);
 if(!Number.isInteger(ticket)||ticket<0||ticket>=total)throw new Error('Geçersiz çark sonucu.');
 for(const reward of WHEEL_REWARDS){ticket-=reward.weight;if(ticket<0)return reward;}
}

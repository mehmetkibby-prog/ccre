export const SEASONAL_AREAS = [
 ['forest','Kuzey Ormanı'],['frozen','Donmuş Çam Geçidi'],['black','Kara Bölge'],
 ['bazaar','Pazar Köyü'],['fishing','Balıkçılık Sahili'],['sanctum','Yaşam Çekirdeği Tapınağı'],
 ['sinsi','Sinsi Taş Vadisi'],['war','Savaş Meydanı'],['arena','Arena'],
["ancient","Kadim Kök Vadisi"],["afk","Oto Av Adası"],["dragon","Ejderha Krateri"],["event","Etkinlik Adası"],["rune","Rün Kıyısı"]];
export const SEASONAL_THEMES = ['none','new_year','halloween','ramadan','first_light'];
export function seasonalTheme(settings,area,inDungeon=false){
 if(inDungeon||!SEASONAL_AREAS.some(([id])=>id===area))return 'none';
 let map;try{map=JSON.parse(settings?.seasonal_themes_json??'{}');}catch{map={};}
 if(map&&Object.hasOwn(map,area)&&SEASONAL_THEMES.includes(map[area]))return map[area];
 return Number(settings?.new_year_mode)===1?'new_year':Number(settings?.halloween_mode)===1?'halloween':'none';
}

export const SEASONAL_ART = {
 new_year:{label:'Noel / Yeni Yıl',subtitle:'Işıklı çamlar, kızaklar ve buz geyikleri',asset:'/game/festival-new-year-v286.webp',color:'#e7c579'},
 halloween:{label:'Halloween',subtitle:'Hasat arabaları, korkuluklar ve fenerler',asset:'/game/festival-halloween-v286.webp',color:'#efad69'},
 ramadan:{label:'Ramazan',subtitle:'Fanuslar, hilaller ve iftar köşeleri',asset:'/game/festival-ramadan-v286.webp',color:'#7ed6c4'},
 first_light:{label:'İlk Işık Şenliği',subtitle:'Açık beta · Birlikte doğan bir dünya',asset:'/game/festival-first-light-v286.webp',color:'#ace0b8'},
};

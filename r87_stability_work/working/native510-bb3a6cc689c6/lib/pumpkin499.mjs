// Account-owned, real-clock entitlement. Cosmetic visibility is deliberately
// absent from this contract: hiding a sprite never changes paid bonuses.
export const PUMPKIN_PRODUCT499='pumpkin_knight499';
export const PUMPKIN_DURATION499=7*86400000;
export const PUMPKIN_ITEM499=Object.freeze({name:'Bal Kabağı Şövalyesi Seti',price:250,shopOnly499:true,image:'/game/pumpkin-knight-icon499.webp',description:'7 günlük zırh ve sınıfa uygun silah görünümü. Toplam +1000 Can, +20 saldırı, canavarlara karşı %10 güç ve %25 canavar tecrübesi. Süre satın alınca başlar; çevrimdışıyken de ilerler. Çantadan kuşanılır.'});
export function pumpkinActive499(player,now=Date.now()){return player?.pumpkin_enabled499===1&&Number.isSafeInteger(player.pumpkin_until499)&&player.pumpkin_until499>now;}
export function pumpkinSql499(alias='players'){if(!/^[A-Za-z_][A-Za-z0-9_]*$/.test(alias))throw Error('Invalid SQL alias');return `${alias}.pumpkin_enabled499=1 AND ${alias}.pumpkin_until499>CAST(ROUND((julianday('now')-2440587.5)*86400000) AS INTEGER)`;}
export function projectPumpkinAppearance499(appearance,now=Date.now()){
 if(!appearance?.premiumBuff?.pumpkin||appearance.premiumBuff.pumpkinUntil>now)return appearance;
 const old=appearance.premiumBuff;
 return {...appearance,premiumBuff:{...old,pumpkin:false,attack:Math.max(0,(old.attack??0)-20),hp:Math.max(0,(old.hp??0)-1000),monsters:0}};
}

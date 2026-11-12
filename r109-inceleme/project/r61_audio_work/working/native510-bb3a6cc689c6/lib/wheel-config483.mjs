import {WHEEL_REWARDS} from './premium-catalog.mjs';

// Probabilities only. Product identity, amount, charge and transaction/receipt
// handling remain in the existing PremiumEngine.
export function validateWheelChances483(value,rewards=WHEEL_REWARDS){
 const keys=rewards.map(r=>r.id);
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length!==keys.length||Object.keys(value).some(k=>!keys.includes(k)))throw Error('Çarktaki tüm ödüllerin oranlarını gir.');
 const next={};let total=0;
 for(const key of keys){const n=value[key];if(typeof n!=='number'||!Number.isFinite(n)||n<0||n>100||Math.abs(n*100-Math.round(n*100))>0.000001)throw Error('Çark oranları %0–100 arasında, en fazla iki ondalıklı olmalı.');next[key]=n;total+=Math.round(n*100);}
 if(total!==10000)throw Error('Çark oranlarının toplamı %100 olmalı.');
 return next;
}
export function defaultWheelChances483(rewards=WHEEL_REWARDS){
 const total=rewards.reduce((n,r)=>n+r.weight,0);
 return validateWheelChances483(Object.fromEntries(rewards.map(r=>[r.id,r.weight*100/total])),rewards);
}
export function ensureWheelSettings483(db){
 const cols=new Set(db.prepare('PRAGMA table_info(premium_shop_settings)').all().map(r=>r.name));
 if(!cols.has('wheel_chances483_json'))db.exec("ALTER TABLE premium_shop_settings ADD COLUMN wheel_chances483_json TEXT NOT NULL DEFAULT ''");
 if(!cols.has('wheel_revision483'))db.exec('ALTER TABLE premium_shop_settings ADD COLUMN wheel_revision483 INTEGER NOT NULL DEFAULT 0');
}
export function readWheelSettings483(db){
 const row=db.prepare('SELECT wheel_chances483_json,wheel_revision483 FROM premium_shop_settings WHERE id=1').get();
 if(!row||!Number.isSafeInteger(row.wheel_revision483)||row.wheel_revision483<0)throw Error('Çark ayarları okunamadı.');
 // Never silently replace corrupt persisted economic configuration.
 const chances=row.wheel_chances483_json===''?defaultWheelChances483():validateWheelChances483(JSON.parse(row.wheel_chances483_json));
 return {revision:row.wheel_revision483,chances,rewards:WHEEL_REWARDS.map(({id,name,amount})=>({id,name,amount}))};
}
export function saveWheelSettings483(db,value,revision){
 if(!Number.isSafeInteger(revision)||revision<0||revision>=Number.MAX_SAFE_INTEGER)throw Error('Çark ayar sürümü geçersiz. Paneli yenile.');
 const chances=validateWheelChances483(value);
 const result=db.prepare('UPDATE premium_shop_settings SET wheel_chances483_json=?,wheel_revision483=wheel_revision483+1 WHERE id=1 AND wheel_revision483=?').run(JSON.stringify(chances),revision);
 if(result.changes!==1)throw Error('Çark oranları başka oturumda değişti. Paneli yenile.');
 return readWheelSettings483(db);
}
export function wheelRewardAt483(ticket,value){
 const chances=validateWheelChances483(value);
 if(!Number.isInteger(ticket)||ticket<0||ticket>=10000)throw Error('Geçersiz çark sonucu.');
 for(const reward of WHEEL_REWARDS){ticket-=Math.round(chances[reward.id]*100);if(ticket<0)return reward;}
 throw Error('Çark sonucu bulunamadı.');
}

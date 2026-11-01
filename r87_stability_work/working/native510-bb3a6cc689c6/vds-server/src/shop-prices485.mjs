/** Requested V485 prices are installed once. Later administrator edits survive. */
export function ensureShopPrices485(db) {
 const cols=new Set(db.prepare('PRAGMA table_info(premium_shop_settings)').all().map(r=>r.name));
 for(const key of ['coupon_prices_v485','wing_price_v485'])if(!cols.has(key))db.exec(`ALTER TABLE premium_shop_settings ADD COLUMN ${key} INTEGER NOT NULL DEFAULT 0`);
 const row=db.prepare('SELECT prices_json,coupon_prices_v485,wing_price_v485 FROM premium_shop_settings WHERE id=1').get();
 if(!row)return {coupons:false,wings:false};
 let coupons=false,wings=false;
 db.exec('SAVEPOINT shop_prices485');
 try {
  if(!row.coupon_prices_v485){
   let prices;try{prices=JSON.parse(row.prices_json);}catch{}
   if(prices&&typeof prices==='object'&&!Array.isArray(prices)){
    for(const [key,base]of Object.entries({cp_coupon_100:110,cp_coupon_200:220,cp_coupon_500:550}))prices[key]={base,discount:0};
    coupons=db.prepare('UPDATE premium_shop_settings SET prices_json=?,coupon_prices_v485=1 WHERE id=1 AND coupon_prices_v485=0 AND prices_json=?').run(JSON.stringify(prices),row.prices_json).changes===1;
   }
  }
  if(!row.wing_price_v485&&db.prepare('PRAGMA table_info(game_settings)').all().some(r=>r.name==='wing_gem_cost')){
   wings=db.prepare('UPDATE game_settings SET wing_gem_cost=100000 WHERE id=1').run().changes===1;
   if(wings)db.prepare('UPDATE premium_shop_settings SET wing_price_v485=1 WHERE id=1 AND wing_price_v485=0').run();
  }
  db.exec('RELEASE shop_prices485');return {coupons,wings};
 }catch(error){db.exec('ROLLBACK TO shop_prices485; RELEASE shop_prices485');throw error;}
}

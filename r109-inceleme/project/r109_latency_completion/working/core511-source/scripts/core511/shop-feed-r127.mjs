import {marketShopDeadline} from './generated/market-clock-rules.mjs';

// Query-only worker. The same transaction also reads the revision. Absolute
// expiry times give every channel the same image even at a premium-item expiry.
export function publicShopRows(sql) {
  const shops=sql.prepare(`SELECT s.id,s.owner_id,s.owner_name,s.name,s.x,s.y,s.channel,s.active,s.created_at,
    p.stall_skin_enabled,(SELECT COUNT(*) FROM market_listings l WHERE l.shop_id=s.id) AS stock_count502
    FROM market_shops s LEFT JOIN players p ON p.id=s.owner_id ORDER BY s.created_at,s.id`).all();
  const bySeller=new Map();
  for(const shop of shops){
    if(!shop.active)continue;
    const rows=bySeller.get(shop.owner_id)??[];
    rows.push(shop);bySeller.set(shop.owner_id,rows);
  }
  if(bySeller.size){
    const premiums=sql.prepare(`SELECT seller_id, CASE
      WHEN product IN ('weapon_skin','teleport_skin') THEN COALESCE(json_extract(payload,'$.expires_at_ms'),0)
      WHEN product='costume' THEN COALESCE(json_extract(payload,'$.item.expires_at_ms'),0)
      ELSE -1 END AS expires FROM premium_listings ORDER BY seller_id,id`).all();
    for(const premium of premiums)for(const shop of bySeller.get(premium.seller_id)??[]){
      if(premium.expires===-1)shop.stock_count502++;
      else if(premium.expires>0)(shop.expiries??=[]).push(premium.expires);
    }
  }
  return shops.map(shop=>shop.active?shop:{id:shop.id,active:0,created_at:shop.created_at});
}

// TEMP avoids persisting trigger definitions on rollback. The shared writer
// connection performs all shop/listing mutations, and only publishes after sync.
export function trackShopStock(sql){
  const bump=' BEGIN UPDATE kernel511_market_version SET revision=revision+1 WHERE id=1; END;';
  for(const [table,fields] of [['market_listings','shop_id'],['premium_listings','seller_id,product,payload']]){
    for(const [name,event] of [['add','INSERT'],['remove','DELETE'],['edit','UPDATE OF '+fields]]){
      sql.exec('CREATE TEMP TRIGGER IF NOT EXISTS r127_'+table+'_'+name+' AFTER '+event+' ON '+table+bump);
    }
  }
  sql.exec('CREATE TEMP TRIGGER IF NOT EXISTS r127_stall_edit AFTER UPDATE OF owner_id,owner_name,name,x,y,channel ON market_shops'+bump);
  sql.exec('CREATE TEMP TRIGGER IF NOT EXISTS r127_stall_skin AFTER UPDATE OF stall_skin_enabled ON players WHEN NEW.stall_skin_enabled IS NOT OLD.stall_skin_enabled AND EXISTS(SELECT 1 FROM market_shops WHERE owner_id=NEW.id AND active=1)'+bump);
}

export function visibleShops(market,cold,viewer,channel,now){
  const shops=[];let until=Infinity;
  const original=new Map(cold.map(shop=>[shop.id,shop]));
  for(const entry of market.values()){
    // Older in-flight metadata can close or expire an existing stall.
    const row=entry.owner_id?entry:original.get(entry.id);
    if(!entry.active||!row||row.created_at!==entry.created_at||(entry.owner_id&&row.channel!==channel)||marketShopDeadline(row)<=now)continue;
    if(!entry.owner_id){shops.push(row);until=Math.min(until,marketShopDeadline(row));continue;}
    const {expiries=[],...shop}=row;
    let available=shop.stock_count502??0;
    for(const deadline of expiries)if(deadline>now){available++;until=Math.min(until,deadline);}
    if(shop.owner_id===viewer || available>0){
      shops.push({...shop,stock_count502:available});until=Math.min(until,marketShopDeadline(shop));
    }
  }
  return {shops,until};
}


// Only these exact listings-only triggers may participate in the combat fast path.
export const shopTriggerHashes=Object.freeze({
  "temp:r127_stall_skin": "22198c005dd3ca43994df3d427ce67c46e9acbadd181c76d041b99dbba2b39d2",
  "temp:r127_market_listings_add": "3885023b57039c0f189710a977ff9b5b34681841a40341699fb670e1963f87c6",
  "temp:r127_market_listings_remove": "32bae2e73d4e3d92beb2d483c6f3e40bfde69b8757518f3a23f5e46bddf8716d",
  "temp:r127_market_listings_edit": "137bc2092bdd9c52c3acb30afbafd53057adc1b27e13223d2a4ef978d2961d3b",
  "temp:r127_premium_listings_add": "fecc3c5ff60ed10fa76f13b58d36027df791556ca39a471907a9adf92da89a61",
  "temp:r127_premium_listings_remove": "7ec47543953fa4d2f9fb796a7ae935f078202fb70dfdb72d0e8c03360f0ad458",
  "temp:r127_premium_listings_edit": "34f2c9fb557968f7e1ed8a3b4c66369cd0919739dc81e7eb99531f01db8897b0",
  "temp:r127_stall_edit": "917121e62930bad768d5c64b0a8df13bd870f2b99820ddd9b97244c4a677ca86"
});

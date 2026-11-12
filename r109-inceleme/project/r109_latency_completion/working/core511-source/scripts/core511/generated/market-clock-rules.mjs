// Derived from the exact native cold-world SQL lifetime predicate.
export const MARKET_SHOP_LIFETIME_SECONDS=172800;
export const marketShopDeadline=row=>(Number(row.created_at)+MARKET_SHOP_LIFETIME_SECONDS)*1000;
export function liveMarketShops(rows,nowMs){if(!Array.isArray(rows))return rows;const cutoff=Math.floor(nowMs/1000)-MARKET_SHOP_LIFETIME_SECONDS;return rows.every(row=>Number(row.created_at)>cutoff)?rows:rows.filter(row=>Number(row.created_at)>cutoff);}

// One shared curve for the client, authoritative rewards and admin preview.
export const LEVEL_CAP = 65;
export const EXPANDED_LEVEL_BANDS = [{from:50,to:55},{from:55,to:60},{from:60,to:65}];
export function extendLevelCosts(input){
 const costs=validateLevelCosts(input);
 while(costs.length<64)costs.push(Math.min(100000000,Math.max(20000,Math.round(costs.at(-1)*1.12))));
 return costs;
}
export const LEVEL_BANDS = [
  {from:1,to:10,minutes:15,rate:300}, {from:10,to:20,minutes:150,rate:300},
  {from:20,to:30,minutes:360,rate:600}, {from:30,to:40,minutes:720,rate:600},
  {from:40,to:45,minutes:600,rate:900}, {from:45,to:50,minutes:1200,rate:900},
];
export function defaultLevelCosts() {
  return LEVEL_BANDS.flatMap(({from,to,minutes,rate}) => {
    const n=to-from, weights=Array.from({length:n},(_,i)=>from===1?i+1:1+i/(n-1));
    const sum=weights.reduce((a,b)=>a+b,0);
    const costs=weights.map(w=>Math.round(minutes*rate*w/sum));
    costs[n-1]+=minutes*rate-costs.reduce((a,b)=>a+b,0);return costs;
  });
}
export function validateLevelCosts(input) {
  if(!Array.isArray(input)||![49,64].includes(input.length)||input.some((n,i)=>!Number.isSafeInteger(n)||n<1||n>100000000||(i>0&&n<input[i-1])))
    throw new Error('49 veya 64 seviye geçişinin TP bedeli 1–100.000.000 arasında, tam sayı ve azalmayan sırada olmalı.');
  return input.slice();
}
export function levelCosts(settings={}) {
  if(settings.xp_curve_json) return validateLevelCosts(JSON.parse(settings.xp_curve_json));
  return Array.from({length:49},(_,i)=>Math.max(1,Math.round((settings.xp_base_cost??50)+i*(settings.xp_growth_per_level??10))));
}
export function levelStart(level,costs) {return costs.slice(0,Math.max(0,Math.min(costs.length,Math.floor(level)-1))).reduce((a,b)=>a+b,0);}
// Applied inside the same transaction as the curve change. Never changes level,
// gear, currencies or other progression. Existing level >50 accounts are retained.
export const REBASE_XP_SQL = `WITH
 old AS(SELECT CAST(key AS INTEGER)+1 AS level,CAST(value AS INTEGER) AS cost,
 COALESCE(SUM(CAST(value AS INTEGER)) OVER(ORDER BY CAST(key AS INTEGER) ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING),0) AS start FROM json_each(?)),
 fresh AS(SELECT CAST(key AS INTEGER)+1 AS level,CAST(value AS INTEGER) AS cost,
 COALESCE(SUM(CAST(value AS INTEGER)) OVER(ORDER BY CAST(key AS INTEGER) ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING),0) AS start FROM json_each(?))
 UPDATE players SET xp=CASE WHEN level=(SELECT MAX(level)+1 FROM fresh) THEN (SELECT SUM(cost) FROM fresh) ELSE
 (SELECT fresh.start+MIN(fresh.cost-1,CAST(MAX(0,MIN(0.999999999,1.0*(players.xp-old.start)/old.cost))*fresh.cost AS INTEGER))
 FROM old JOIN fresh USING(level) WHERE old.level=players.level) END
 WHERE level BETWEEN 1 AND (SELECT MAX(level)+1 FROM fresh) AND EXISTS(SELECT 1 FROM game_settings WHERE id=1 AND xp_curve_json=?)`;

// Owner-selected temporary balance, matching the six displayed band totals.
export const TEMP_LEVEL_TOTALS = [2304,4830,9119,15195,26261,40341];
export function temporaryLevelCosts() {
 return LEVEL_BANDS.flatMap(({from,to},band)=>{
  const n=to-from,total=TEMP_LEVEL_TOTALS[band];
  const weights=Array.from({length:n},(_,i)=>band===0?.5+i/(n-1):.85+.3*i/(n-1));
  const sum=weights.reduce((a,b)=>a+b,0),costs=weights.map(w=>Math.floor(total*w/sum));
  const remainder=total-costs.reduce((a,b)=>a+b,0);
  for(let i=n-remainder;i<n;i++)costs[i]++;
  return costs;
 });
}
const safeCost=value=>Math.max(1,Math.min(100000000,Math.round(Number(value)||1)));
export function adjustLevelCosts(previous,from,to,factor=1,value) {
 const costs=validateLevelCosts(previous),start=from-1,end=to-2;
 if(!Number.isInteger(start)||!Number.isInteger(end)||start<0||end>=costs.length||end<start)throw new Error('Geçersiz seviye aralığı.');
 for(let i=start;i<=end;i++)costs[i]=safeCost(value===undefined?costs[i]*factor:value);
 for(let i=start+1;i<=end;i++)costs[i]=Math.max(costs[i-1],costs[i]);
 // Keep the requested range, adjust only neighbours that would violate order.
 for(let i=start-1;i>=0;i--)costs[i]=Math.min(costs[i],costs[i+1]);
 for(let i=end+1;i<costs.length;i++)costs[i]=Math.max(costs[i],costs[i-1]);
 return validateLevelCosts(costs);
}

import {DAILY_PRIZES_R76} from './daily-monster-rewards-r76.mjs';
// Preserve the native eligibility, UTC+3 cutoff, row order and 10s read cache.
// The native winner-only field remains compatible, with the actual total150.
export function createMonsterRankingR76(createNative,...args){
 const ranking=createNative(...args);
 return {...ranking,read(...readArgs){const result=ranking.read(...readArgs);return {...result,winnerRewardCoins:DAILY_PRIZES_R76[0],rewardCoins:[...DAILY_PRIZES_R76],rows:result.rows.map(row=>({...row,rewardCoins:DAILY_PRIZES_R76[row.rank-1]??0}))};}};
}

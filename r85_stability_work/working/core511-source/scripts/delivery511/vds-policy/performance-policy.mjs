// Explicit user amendment 2026-10-14 22:57 Europe/Istanbul. All raw samples
// remain counted. Only the actual simultaneous potion interval has its own
// input budget; the rest of the first ten seconds is NORMAL gameplay.
export const PERFORMANCE_POLICY=Object.freeze({id:'vds-user-20261015-1749',durationMs:180000,players:100,capacity:25,tickP95Ms:55,tickP99Ms:100,maxPauseMs:300,mainWorldMaxPauseMs:200,inputP99Ms:250,inputMaxMs:500,potionBurstMaxMs:2500,bossPotionP99Ms:250,bossPotionMaxMs:500,bossPotionSpreadMs:2000,mainElu:.5,maxRssBytes:3*1024**3});
export const pauseLimit=target=>target==='main'||target==='world'?PERFORMANCE_POLICY.mainWorldMaxPauseMs:PERFORMANCE_POLICY.maxPauseMs;
// 3 GiB for game owners leaves at least 1 GiB of the 4 GiB VDS for nginx,
// OS and measurement clients. Actual nginx/host totals remain release evidence.

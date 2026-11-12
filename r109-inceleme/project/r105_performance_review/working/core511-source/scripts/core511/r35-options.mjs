// Read once per process. The installer changes these only in maintenance and
// restarts every owner together; no mid-transaction change is possible.
const enabled=name=>process.env[name]!=='0';
export const r35Options=Object.freeze({
 encounterSoft:enabled('CORE511_ENCOUNTER_SOFT'),
 compactReceipt:enabled('CORE511_COMPACT_RECEIPT'),
 engagementSync:enabled('CORE511_ENGAGEMENT_SYNC_V2'),
 writerHygiene:enabled('CORE511_WRITER_HYGIENE'),
 aggroStagger:enabled('CORE511_AGGRO_STAGGER'),
 channelMicro:enabled('CORE511_CHANNEL_MICRO'),
 slimReload:['0','shadow'].includes(process.env.CORE511_SLIM_RELOAD)?process.env.CORE511_SLIM_RELOAD:'1',
 outboxV2:enabled('CORE511_OUTBOX_V2'),
 localCollect:enabled('CORE511_LOCAL_COLLECT'),
 localAoe:enabled('CORE511_LOCAL_AOE'),
 localMixed:enabled('CORE511_LOCAL_MIXED'),
 globalFair:enabled('CORE511_GLOBAL_FAIR'),
 globalRefresh:enabled('CORE511_GLOBAL_REFRESH'),
 retention:enabled('CORE511_RETENTION'),
 idleCheckpoint:process.env.CORE511_IDLE_CHECKPOINT==='1',
});

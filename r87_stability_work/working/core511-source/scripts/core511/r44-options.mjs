// Set only at process start; installer changes it under maintenance.
export const r44Options=Object.freeze({remoteMotionPrediction:process.env.CORE511_REMOTE_MOTION_PREDICTION!=='0',motionDirect:process.env.CORE511_MOTION_DIRECT!=='0',slimEntityDelta:process.env.CORE511_SLIM_ENTITY_DELTA!=='0',combatFifo:process.env.CORE511_COMBAT_FIFO!=='0',readSnapshotBatch:process.env.CORE511_READ_SNAPSHOT_BATCH!=='0'});

export const R44_UI_OPTIONS_BODY=JSON.stringify({remoteMotionPrediction:r44Options.remoteMotionPrediction});

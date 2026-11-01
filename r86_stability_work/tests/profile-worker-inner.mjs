// A single diagnostic run; performance numbers are not acceptance evidence.
import fs from 'node:fs';
process.env.CORE511_STAGE_TIMING='1';
const {RewardWorkerR533}=await import('/workspace/ccre/r85_stability_work/working/core511-source/scripts/core511/reward-worker-r533.mjs');
const original=RewardWorkerR533.prototype.start;
RewardWorkerR533.prototype.start=function(){this.entry=new URL('./worker-profile-entry.mjs',import.meta.url);return original.call(this);};
await import('/workspace/ccre/r85_stability_work/tests/runtime/native-mixed-load-realistic.mjs');

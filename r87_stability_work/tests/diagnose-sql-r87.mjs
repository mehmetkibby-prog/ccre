import './profile-sql-r87.mjs';
import {RewardWorkerR533} from '../working/core511-source/scripts/core511/reward-worker-r533.mjs';
const original=RewardWorkerR533.prototype.start;
RewardWorkerR533.prototype.start=function(...args){this.entry=new URL('./worker-sql-r87.mjs',import.meta.url);return original.apply(this,args);};
await import('/workspace/ccre/r85_stability_work/tests/runtime/native-mixed-load-realistic.mjs');

import {createPerfR18Features} from './feature-settings-r18.mjs';
export const perfR18Features=createPerfR18Features([{name:'optimize',environment:'COL_PERF_R18_OPTIMIZE',default:true}]);
export const optimizeR18=perfR18Features.enabled('optimize');
globalThis[Symbol.for('coreoflife.perf.r18')]=perfR18Features.snapshot;

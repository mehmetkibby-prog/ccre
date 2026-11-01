import {createV510Features,V510_FEATURE_DEFINITIONS} from './feature-settings510.mjs';
export const v510Features=createV510Features(V510_FEATURE_DEFINITIONS);
export const feature510=name=>v510Features.enabled(name);
globalThis[Symbol.for('coreoflife.features.v510')]=v510Features.snapshot;

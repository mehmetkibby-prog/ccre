import {createV504Features,V504_FEATURE_DEFINITIONS} from './feature-settings504.mjs';
export const v504Features=createV504Features(V504_FEATURE_DEFINITIONS);
export const feature504=name=>v504Features.enabled(name);
globalThis[Symbol.for('coreoflife.features.v504')]=v504Features.snapshot;

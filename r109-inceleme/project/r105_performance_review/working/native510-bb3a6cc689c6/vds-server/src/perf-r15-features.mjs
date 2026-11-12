import { createPerfR15Features } from './feature-settings-r15.mjs';

// R15 performance toggles; absence of an owned installation keeps prior behavior.
export const PERF_R15_DEFINITIONS = Object.freeze([
  { name: 'botMovementAuthority', environment: 'COL_PERF_R15_BOT_MOVEMENT_AUTHORITY', default: false },
  { name: 'generatorHttpReuse', environment: 'COL_PERF_R15_GENERATOR_HTTP_REUSE', default: false },
]);
export const PERF_R15_FEATURE_NAMES = Object.freeze(PERF_R15_DEFINITIONS.map(row => row.name));
export const perfR15Features = createPerfR15Features(PERF_R15_DEFINITIONS);

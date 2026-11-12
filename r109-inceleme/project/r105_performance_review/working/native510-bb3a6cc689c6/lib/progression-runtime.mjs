import {SOLO_DEFAULTS} from './solo-dungeon.mjs';
import {UPGRADE_MATERIAL_DEFAULTS} from './progression-materials.mjs';
export function progressionSettings(){return globalThis.__colProgression?.snapshot()??{revision:0,solo:SOLO_DEFAULTS,materials:UPGRADE_MATERIAL_DEFAULTS};}

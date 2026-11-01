import {r40Options} from './r40-options.mjs';

export const BAG_PENDING_LIMIT=35;
export const bagPendingBounded=r40Options.bagLimit&&process.env.CORE511_BAG_PENDING_BOUNDED!=='0';

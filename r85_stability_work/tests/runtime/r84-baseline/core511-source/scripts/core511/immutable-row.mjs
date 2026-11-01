// Only reuse copies made here: Object.isFrozen alone would also admit getters
// whose values can change. Spreading first preserves the old data-row contract.
import {isEngagementR53} from './engagement-memory-r53.mjs';
const owned=new WeakSet();
export function immutableRow(row){
 if(!row)return row;
 if(owned.has(row)||isEngagementR53(row))return row;
 const value=Object.freeze({...row});owned.add(value);return value;
}

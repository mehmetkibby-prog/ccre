import {kernelError} from './contract.mjs';

// Private provenance, not a trusted error-code string. Only an audited local
// monster footprint mismatch may become a retry, and only AFTER its savepoint
// and service caches have been successfully rolled back.
const mismatches=new WeakSet(),rolledBack=new WeakSet();
export function localMonsterMismatch(payload){
 if(payload.sharedLease||!['kill','mixed'].includes(payload.localScope?.kind))return null;
 const error=kernelError('local_kill_requires_shared');mismatches.add(error);return error;
}
export const isLocalMonsterMismatch=error=>mismatches.has(error);
export function markLocalRollback(error){if(mismatches.has(error))rolledBack.add(error);}
export const isLocalRollback=error=>rolledBack.has(error);

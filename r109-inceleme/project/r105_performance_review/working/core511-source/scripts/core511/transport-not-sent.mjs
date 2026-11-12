import {actorFaultIsolation} from './r48-options.mjs';
import {rejectActorJob,rejectUnsubmittedSharedActorJob} from './actor-rejection.mjs';

// This proof is local and cannot be reconstructed from an IPC error code.
// Mint it only before a request enters the pending/replay queue. In particular,
// a too-large RESPONSE can follow a committed write and never gets this proof.
const unsent=new WeakMap();
export function markTransportNotSent(error,method,payload){
 if(actorFaultIsolation&&['ipc_frame_size','ipc_backpressure'].includes(error?.code))unsent.set(error,{method,payload});
 return error;
}
export function consumeTransportNotSent(error,method,payload){
 const proof=unsent.get(error);if(!actorFaultIsolation||proof?.method!==method||proof.payload!==payload)return false;
 unsent.delete(error);return true;
}
export function rejectUnsentActorJob(error,peer,request){
 if(!consumeTransportNotSent(error,'command',request))return error;
 return request.payload?.sharedLease?rejectUnsubmittedSharedActorJob(error,peer,request):rejectActorJob(error,peer,request);
}

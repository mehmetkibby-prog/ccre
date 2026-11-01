import {retiredActorIsolation} from './r48_2-options.mjs';

// Diagnostic provenance only. It never grants an actor-rejection, an ACK or
// authority to retire an owner. Store bounded names from our pending request,
// not values supplied in the peer's error frame or arbitrary exception text.
const requests=new WeakMap();
const name=value=>typeof value==='string'&&/^[a-zA-Z][a-zA-Z0-9_.:-]{0,79}$/.test(value);
export function markIpcRequestError(error,method,payload){
 if(retiredActorIsolation&&error&&typeof error==='object'&&name(method))requests.set(error,Object.freeze({requestMethod:method,...(name(payload?.operation)?{requestOperation:payload.operation}:{})}));
 return error;
}
export function ipcRequestContext(error){return retiredActorIsolation&&error&&typeof error==='object'?requests.get(error):undefined;}

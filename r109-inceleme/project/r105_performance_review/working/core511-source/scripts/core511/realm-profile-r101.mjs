// Set by the installer in the service environment, before workers import core.
// Never accept a capacity or a realm identity from a browser request.
export function realmProfileR101(env = process.env) {
 const id = env.CORE101_REALM_ID;
 if (id === undefined || id === '') return Object.freeze({id:'r1',name:'Core Efsane',capacity:25,enabled:false});
 if (id !== 'r1' && id !== 'r2') throw Error('r101_unknown_realm');
 return Object.freeze({id,name:id==='r1'?'Core Efsane':'Core Akademi',capacity:id==='r2'?10:25,enabled:true});
}
export const REALM_R101=realmProfileR101();

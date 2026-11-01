import {native} from './helpers.mjs';
const {RealmSecurityGate}=await native('vds-server/src/realm-security-gate.mjs');
export const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};

// Exact native cache/single-flight gate and local admission SQL. The signed
// central transport is a controlled fixture; no external accounts are used.
export function realmGate(s){
 const {f,core,admission}=s,errors=[];let state={securityVersion:f.account.security_version,blocked:false,canPlay:true};
 const gate=new RealmSecurityGate({now:f.clock,readSecurity:async()=>state,applySecurity:(...args)=>admission.applySecurity(...args),onRefreshError:error=>errors.push(error)});core.nativeRealmSecurity.bindGate(gate);
 const realm={role:'game',id:core.realmId,realm:{status:'open'},policy:{status:'open'},admission,security:gate};core.realm=realm;globalThis.__colRealm=realm;
 return {gate,realm,errors,setState:value=>{state=value;}};
}

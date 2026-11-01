import {stat,statfs} from 'node:fs/promises';
export function requireBackupSpace(databaseBytes,availableBytes) {
 const requiredBytes=3n*BigInt(databaseBytes)+1073741824n;
 if(BigInt(availableBytes)<requiredBytes)throw new Error(`Insufficient backup space: required ${requiredBytes} bytes, available ${availableBytes} bytes`);
 return {databaseBytes:String(databaseBytes),availableBytes:String(availableBytes),requiredBytes:String(requiredBytes)};
}
export async function checkBackupSpace(database,archiveRoot) {
 const [file,disk]=await Promise.all([stat(database,{bigint:true}),statfs(archiveRoot,{bigint:true})]);
 return requireBackupSpace(file.size,disk.bavail*disk.bsize);
}
export function restoreLegacyRealtime(system,state) {
 return restoreRealmServiceState(system,'coreoflife-realtime.service',state);
}
export function restoreRealmServiceState(system,name,state) {
 if(state.enabled==='enabled'||state.enabled==='enabled-runtime')system('enable',...(state.enabled==='enabled-runtime'?['--runtime']:[]),name);
 else if(state.enabled==='disabled')system('disable',name);
 else if(state.active&&(state.enabled==='masked'||state.enabled==='masked-runtime'))system('unmask',...(state.enabled==='masked-runtime'?['--runtime']:[]),name);
 system(state.active?'start':'stop',name);
 if(state.enabled==='masked'||state.enabled==='masked-runtime')system('mask',...(state.enabled==='masked-runtime'?['--runtime']:[]),name);
}

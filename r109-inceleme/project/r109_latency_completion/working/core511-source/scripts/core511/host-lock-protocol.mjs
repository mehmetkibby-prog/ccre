import {fstatSync} from 'node:fs';
import {demand,kernelError} from './contract.mjs';
export const HOST_LOCK_PROTOCOL='core511-database-host-v1';
export const hostFileIdentity=stat=>({dev:String(stat.dev),ino:String(stat.ino)});
export const sameHostFile=(a,b)=>a.dev===b.dev&&a.ino===b.ino;

// Private bootstrap metadata only. Children retain this descriptor until
// actual OS exit, and never use it for database reads or writes.
export function assertInheritedHostLock(descriptor){
 if(descriptor===null||descriptor===undefined)return;
 demand(descriptor.protocol===HOST_LOCK_PROTOCOL&&descriptor.fd===4&&typeof descriptor.dev==='string'&&typeof descriptor.ino==='string','host_child_lock_scope');
 let stat;try{stat=fstatSync(4,{bigint:true});}catch{throw kernelError('host_child_lock_missing');}demand(stat.isFile()&&sameHostFile(hostFileIdentity(stat),descriptor),'host_child_lock_changed');
}

import fs from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {demand} from './contract.mjs';
const MARKER='core511-disposable-validation.json';
// Filesystem lifecycle only. OS isolation must ALSO deny the validation
// processes access to production DB/config paths and external services.
export class IsolatedRoots {
 constructor(parent){this.parent=path.resolve(parent);this.owned=new Map();}
 async create(){
  await fs.mkdir(this.parent,{recursive:true,mode:0o700});const info=await fs.lstat(this.parent);demand(info.isDirectory()&&!info.isSymbolicLink()&&(info.mode&0o077)===0,'validation_parent_not_private');
  const root=await fs.mkdtemp(path.join(this.parent,'kernel511-')),id=randomUUID();await fs.chmod(root,0o700);
  const descriptor={purpose:'kernel511-isolated-validation',id,root};await fs.writeFile(path.join(root,MARKER),JSON.stringify(descriptor),{flag:'wx',mode:0o600});this.owned.set(id,descriptor);return Object.freeze(descriptor);
 }
 async verify(descriptor){
  const owned=this.owned.get(descriptor?.id);demand(owned&&owned.root===descriptor.root,'unowned_validation_root');
  const info=await fs.lstat(owned.root);demand(info.isDirectory()&&!info.isSymbolicLink()&&path.dirname(await fs.realpath(owned.root))===await fs.realpath(this.parent),'validation_path_replaced');
  const marker=JSON.parse(await fs.readFile(path.join(owned.root,MARKER),'utf8'));demand(marker.id===owned.id&&marker.root===owned.root&&marker.purpose===owned.purpose,'validation_marker_changed');return owned;
 }
 async remove(descriptor,{processesStopped}){
  demand(processesStopped===true,'validation_processes_still_running');const owned=await this.verify(descriptor);
  await fs.rm(owned.root,{recursive:true,force:false});this.owned.delete(owned.id);
 }
}

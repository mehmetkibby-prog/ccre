import {readdir,readFile,realpath,lstat,rm} from 'node:fs/promises';import path from 'node:path';
const name=/^(?:416a|417)-[a-f0-9]{16}$/;
const top=new Set(['package.json','package-lock.json','dist-vds','vds-server','realtime-server','drizzle','lib','node_modules','realm-package-manifest.json','realm-release.json','installation-complete.json']);
async function codeOnly(directory,device,relative=''){
 for(const entry of await readdir(path.join(directory,relative),{withFileTypes:true})){
  if(!relative&&!top.has(entry.name))return false;
  const p=path.join(relative,entry.name),file=path.join(directory,p),s=await lstat(file);
  if(s.dev!==device)return false;
  if(entry.name==='node_modules'&&s.isDirectory())continue;
  if(s.isSymbolicLink()||/\.(sqlite|sqlite3|db)(?:-wal|-shm|-journal)?$/.test(entry.name)||['state.json','backups','jobs'].includes(entry.name))return false;
  if(s.isDirectory()&&!await codeOnly(directory,device,p))return false;
 }
 return true;
}
// Caller holds the installer flock. Unknown, incomplete and in-use paths stay.
export async function cleanupRealmReleases(root,{procRoot='/proc'}={}){
 let current;try{current=await realpath(root+'/current');}catch(e){if(e.code==='ENOENT')return[];throw e;}
 const releases=root+'/releases';if(await realpath(root)!==root||await realpath(releases)!==releases||path.dirname(current)!==releases||!name.test(path.basename(current)))throw new Error('Unverified release root; no cleanup');
 const keep=new Set([current]),candidates=[];
 try{const previous=JSON.parse(await readFile(root+'/previous-release.json','utf8')).release;if(path.dirname(previous)!==releases||!name.test(path.basename(previous)))throw new Error('Invalid previous code path');keep.add(previous);}catch(e){if(e.code!=='ENOENT')throw e;}
 for(const entry of await readdir(releases,{withFileTypes:true})){
  if(!entry.isDirectory()||!name.test(entry.name))continue;const file=releases+'/'+entry.name;
  try{const meta=JSON.parse(await readFile(file+'/installation-complete.json','utf8'));const s=await lstat(file);
   if(['416a','417'].includes(meta.version)&&Number.isSafeInteger(meta.completedAtMs)&&s.uid===0&&await codeOnly(file,s.dev))candidates.push({file,at:meta.completedAtMs});
  }catch(e){if(e.code!=='ENOENT')throw e;}
 }
 for(const c of candidates.sort((a,b)=>b.at-a.at).slice(0,2))keep.add(c.file);
 for(const entry of await readdir(procRoot)){
  if(!/^\d+$/.test(entry))continue;let cwd;
  try{cwd=await realpath(procRoot+'/'+entry+'/cwd');}catch(e){if(['ENOENT','ESRCH'].includes(e.code))continue;throw new Error('In-use releases cannot be verified; no cleanup');}
  for(const c of candidates)if(cwd===c.file||cwd.startsWith(c.file+'/'))keep.add(c.file);
 }
 const removed=[];
 for(const c of candidates)if(!keep.has(c.file)){
  if(await realpath(root+'/current')!==current)throw new Error('Current release changed; cleanup stopped');
  await rm(c.file,{recursive:true});removed.push(path.basename(c.file));
 }
 return removed;
}

import {createHash} from 'node:crypto';import {readFile,readdir,lstat,writeFile,realpath} from 'node:fs/promises';import path from 'node:path';
const digest=b=>createHash('sha256').update(b).digest('hex');
const roots=['package.json','package-lock.json','dist-vds','vds-server/src','vds-server/realm','realtime-server/src','realtime-server/package.json','realtime-server/package-lock.json','drizzle','lib'];
const omitted=new Set(['releases','full-install.sh','realtime-install.sh','direct-vds.py','movement-release.json']);
async function walk(root,name){const info=await lstat(path.join(root,name));if(info.isSymbolicLink())throw new Error('Package symlink forbidden');if(info.isFile())return[name];if(!info.isDirectory())throw new Error('Non-regular package member');const files=[];for(const child of (await readdir(path.join(root,name))).sort()){if(omitted.has(child))continue;files.push(...await walk(root,name+'/'+child));}return files;}
export async function writeRealmPackageManifest(root,{version='416a'}={}){
 const names=(await Promise.all(roots.map(name=>walk(root,name)))).flat().sort(),files=[];
 for(const name of names){const bytes=await readFile(path.join(root,name));files.push({path:name,bytes:bytes.length,sha256:digest(bytes)});}
 const body=JSON.stringify({version,schemaVersion:1,files})+'\n';await writeFile(path.join(root,'realm-package-manifest.json'),body);return{revision:digest(body).slice(0,16),files:files.length};
}
export async function verifyRealmPackage(root){
 const body=await readFile(path.join(root,'realm-package-manifest.json')),manifest=JSON.parse(body);
 if(!['416a','417'].includes(manifest.version)||manifest.schemaVersion!==1||!Array.isArray(manifest.files))throw new Error('Invalid realm package');
 const seen=new Set();
 for(const f of manifest.files){
  if(typeof f.path!=='string'||f.path.includes('\\')||f.path.split('/').some(p=>!p||p==='.'||p==='..')||!roots.some(r=>f.path===r||f.path.startsWith(r+'/'))||seen.has(f.path)||!Number.isSafeInteger(f.bytes)||f.bytes<0||!/^[a-f0-9]{64}$/.test(f.sha256))throw new Error('Invalid package file');
  seen.add(f.path);const full=path.join(root,f.path);if(await realpath(full)!==full||!(await lstat(full)).isFile())throw new Error('Invalid package member');
  const bytes=await readFile(full);if(bytes.length!==f.bytes||digest(bytes)!==f.sha256)throw new Error('Package changed: '+f.path);
 }
 for(const required of ['package.json','package-lock.json','vds-server/src/app.mjs','vds-server/src/accounts-app.mjs','vds-server/realm/manage.mjs','realtime-server/src/server.mjs','dist-vds/native-build-manifest.json'])if(!seen.has(required))throw new Error('Missing runtime member');
 return {revision:digest(body).slice(0,16),files:manifest.files};
}

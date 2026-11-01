import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
export const BASE=process.env.COL_CORE511_BASE??path.resolve(import.meta.dirname,'../../../../native510-bb3a6cc689c6');
export const NODE=process.execPath;
const bytes=fs.readFileSync(path.join(BASE,'realm-package-manifest.json'));
export const SHA='bb3a6cc689c695d97f127a2eefb9ad141b0e655eb39bbebeea5f05704074ad3b';
export const hash=value=>createHash('sha256').update(value).digest('hex');
if(hash(bytes)!==SHA)throw Error('Wrong V510 test baseline');
export const manifest=JSON.parse(bytes);
export function native(name){const file=path.join(BASE,name),row=manifest.files.find(row=>row.path===name);if(!row||row.sha256!==hash(fs.readFileSync(file)))throw Error('Native file integrity '+name);return import(pathToFileURL(file).href);}
export function temporary(t){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'core511-isolated-'));t?.after(()=>fs.rmSync(dir,{recursive:true,force:true}));return dir;}
export function seeded(seed=12345){let value=seed>>>0;return ()=>{value=(Math.imul(value,1664525)+1013904223)>>>0;return value/2**32;};}
export const player=(id='p',channel=1)=>({id,channel,cycle:1,area:'forest',instanceId:'',x:0,y:0,hp:100});
export async function until(predicate,timeoutMs=3000){const end=performance.now()+timeoutMs;while(!predicate()){if(performance.now()>=end)throw Error('Test timed out');await new Promise(resolve=>setTimeout(resolve,5));}}

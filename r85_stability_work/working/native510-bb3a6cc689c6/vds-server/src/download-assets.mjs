// Kept at the installer's existing entrypoint. Releases carry their own artwork:
// never fetch new assets from a still-running older game during an upgrade.
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
const manifest=JSON.parse(await readFile('vds-server/game-assets.json','utf8'));
if(!Array.isArray(manifest)||manifest.length>1000)throw new Error('Invalid asset manifest');
for(const entry of manifest){
 if(!/^game\/[A-Za-z0-9/_.-]+$/.test(entry.path)||entry.path.split('/').includes('..')||!/^[a-f0-9]{64}$/.test(entry.sha256)||!Number.isSafeInteger(entry.bytes)||entry.bytes<1||entry.bytes>20000000)throw new Error('Invalid asset entry');
}
let next=0;
await Promise.all(Array.from({length:6},async()=>{
 while(next<manifest.length){
  const entry=manifest[next++];
  let data;
  try{data=await readFile(path.join('dist-vds/client',entry.path));}
  catch(error){throw new Error('Packaged game asset missing: '+entry.path,{cause:error});}
  if(data.length!==entry.bytes||createHash('sha256').update(data).digest('hex')!==entry.sha256)throw new Error('Packaged game asset verification failed: '+entry.path);
 }
}));
console.log('Verified packaged game assets: '+manifest.length);

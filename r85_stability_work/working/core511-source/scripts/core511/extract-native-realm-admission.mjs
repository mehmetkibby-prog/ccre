import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {patchNativeRealmAdmission} from './patch-native-realm-admission.mjs';
const hash=x=>createHash('sha256').update(x).digest('hex'),root=process.env.COL_CORE511_BASE??path.resolve(import.meta.dirname,'../../../native510-bb3a6cc689c6'),pin='bb3a6cc689c695d97f127a2eefb9ad141b0e655eb39bbebeea5f05704074ad3b',bytes=fs.readFileSync(path.join(root,'realm-package-manifest.json'));if(hash(bytes)!==pin)throw Error('Exact V510 required');
const file='vds-server/src/realm-admission.mjs',source=fs.readFileSync(path.join(root,file),'utf8');if(JSON.parse(bytes).files.find(r=>r.path===file)?.sha256!==hash(source))throw Error('Native realm admission changed');const result=patchNativeRealmAdmission(source),out=path.join(import.meta.dirname,'generated');
fs.writeFileSync(path.join(out,'native-realm-admission.mjs'),result.source);fs.writeFileSync(path.join(out,'native-realm-admission-proof.json'),JSON.stringify({baselineManifestSha256:pin,source:file,...result.proof,securityBinding:true,fullRealmHost:false},null,2)+'\n');console.log(JSON.stringify({bytes:Buffer.byteLength(result.source),edits:result.proof.edits.length}));

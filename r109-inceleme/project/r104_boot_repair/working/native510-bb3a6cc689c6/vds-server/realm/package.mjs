import {readFile,mkdir,cp,writeFile} from 'node:fs/promises';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {writeRealmPackageManifest,verifyRealmPackage} from '../src/realm-package-integrity.mjs';import {verifyNativeBuild} from '../src/native-build-integrity.mjs';
const version=process.env.CORE_PACKAGE_VERSION??'416a';if(!['416a','417'].includes(version))throw Error('Unsupported package version');
const root=path.resolve(fileURLToPath(new URL('../..',import.meta.url))),output=path.resolve(process.argv[2]??'/tmp/coreoflife-v'+version+'-package');
if(output===root||output.startsWith(root+'/'))throw new Error('Use a separate output directory');
await verifyNativeBuild(root+'/dist-vds');const result=await writeRealmPackageManifest(root,{version});
const manifest=JSON.parse(await readFile(root+'/realm-package-manifest.json','utf8'));
await mkdir(output,{recursive:true});const runtime=output+'/coreoflife-v'+version;await mkdir(runtime,{recursive:true});
for(const file of [...manifest.files,{path:'realm-package-manifest.json'}]){await mkdir(path.dirname(runtime+'/'+file.path),{recursive:true});await cp(root+'/'+file.path,runtime+'/'+file.path);}
await writeFile(runtime+'/realm-release.json',JSON.stringify({version,schemaVersion:1,revision:result.revision})+'\n');
await verifyRealmPackage(runtime);await verifyNativeBuild(runtime+'/dist-vds');
console.log(JSON.stringify({runtime,...result}));

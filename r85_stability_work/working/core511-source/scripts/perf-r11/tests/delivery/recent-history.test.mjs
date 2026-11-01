import test from 'node:test';
import assert from 'node:assert/strict';
import {sources,hash,jsonBytes,err} from './fixture.mjs';
const settings={
 r10:{fn:'authenticateR10History',priorFn:'authenticateV480History',id:'v477-perf-r10',descriptor:'58088b2ca84e23bb923afa52637bc71e695e4143354c68d3af20cafd2dd82b9c',controller:'d218c108d230c4e6f32330ece9d622ea883b7fc7502cad15dfe882e0c3c90937',native:'b81247615bfc8bc6ec9fd1765908fcf8912c58550a80906e3710343b907c5656',previous:'915c68a27a9d14c6978c2261c4ad6eed4dee74516eb1909c087b8cf0b767e8b3',nativePrevious:'4b6fe1f6dac82d9d28629928ca384bfb10ac458cc2d61ff63990769903a5edc6'},
 video:{fn:'authenticateR10VideoHistory',priorFn:'authenticateR10History',id:'v480-video1-r10',descriptor:'886bc83ed02c4037de85cbf1412f344b7e4f2084d015b4a3ccac4b04da302a2e',controller:'5df9adae6995d1ad5d7408312c64869e47190af95a2c416d08960fb86ec41e1a',native:'3d68e6d71457bc01e38f43b99d095be1c9c5f6abe6ce8cf240e92963c90a82fb',previous:'d218c108d230c4e6f32330ece9d622ea883b7fc7502cad15dfe882e0c3c90937',nativePrevious:'b81247615bfc8bc6ec9fd1765908fcf8912c58550a80906e3710343b907c5656'},
};
function fixture(subject,kind,{writer=null}={}){
 const c=settings[kind],context={root:'/opt/col-loadlab-live',etc:'/etc/col-loadlab-live',previousWriterSetting:writer},CODE='/opt/coreoflife-realms',files=Array.from({length:7},(_,i)=>({path:'fixture-'+i,sha256:hash('file'+i)})),prior={files,adapterReceipt:{targetManifestSha256:c.nativePrevious},permissionRepair:{id:'preserved'},shortPairUpdate:{id:'preserved'},firewall:{id:'preserved'}},priorBytes=jsonBytes(prior),priorNative=jsonBytes(prior.adapterReceipt);
 const original={...prior,schemaVersion:1,role:'live',status:'installed',manifestSha256:c.controller,release:context.root+'/releases/'+c.controller,adapterReceipt:{targetManifestSha256:c.native},performanceUpdate:{id:c.id,phase:'installed',descriptorSha256:c.descriptor,previousManifestSha256:c.previous,previousRelease:context.root+'/releases/'+c.previous,previousNativeManifestSha256:c.nativePrevious,previousNativeRelease:CODE+'/releases/417-'+c.nativePrevious.slice(0,16),backupReceipt:context.etc+'/'+c.id+'.receipt.backup.json',backupNativeReceipt:context.etc+'/'+c.id+'.native.backup.json'}};
 const tx={id:c.id,role:'live',phase:'committed',descriptorSha256:c.descriptor,previous:original.performanceUpdate.previousRelease,target:original.release,nativePrevious:original.performanceUpdate.previousNativeRelease,nativeTarget:CODE+'/releases/417-'+c.native.slice(0,16),nextReceiptSha256:hash(jsonBytes(original)),nextNativeReceiptSha256:hash(jsonBytes(original.adapterReceipt)),originalReceiptSha256:hash(priorBytes),originalNativeReceiptSha256:hash(priorNative),originalWriterSetting:writer};
 const disk=new Map([[original.performanceUpdate.backupReceipt,priorBytes],[original.performanceUpdate.backupNativeReceipt,priorNative]]),txFile=context.etc+'/'+c.id+'.transaction.json',writerFile=context.etc+'/'+c.id+'.writer-toggle.json',calls=[];
 const env={context,CODE,has:async p=>disk.has(p),fileBytes:async p=>{if(p===txFile)return jsonBytes(tx);assert(disk.has(p),p);return disk.get(p);},[c.priorFn]:async(o,b)=>{calls.push([o,b]);assert.deepEqual(o,prior);assert.deepEqual(b,priorBytes);},writerInstallationIdentity:()=> 'bound-prior-installation'};
 const api=subject.run([c.fn],env);return{c,context,original,tx,disk,writerFile,calls,run:()=>api[c.fn](original,jsonBytes(original)),rehash:()=>tx.nextReceiptSha256=hash(jsonBytes(original))};
}
for(const [branch,kinds] of [['live-r10',['r10']],['live-r10-video',['r10','video']]])for(const kind of kinds){
 const subject=sources[branch],prefix=`${branch} ${kind} history`;
 for(const writer of [null,'0','1'])test(prefix+': exact receipt/transaction/native backups preserve writer '+writer,async()=>{const f=fixture(subject,kind,{writer});await f.run();assert.equal(f.calls.length,1);assert.equal(f.context.previousWriterSetting,writer);});
 for(const [name,mutate] of [
  ['receipt descriptor',f=>{f.original.performanceUpdate.descriptorSha256='a'.repeat(64);f.rehash();}],
  ['receipt target',f=>{f.original.manifestSha256='a'.repeat(64);f.rehash();}],
  ['unfinished transaction',f=>f.tx.phase='staging'],['transaction target',f=>f.tx.target+='/foreign'],
  ['outer receipt hash',f=>f.tx.nextReceiptSha256='a'.repeat(64)],['native receipt hash',f=>f.tx.nextNativeReceiptSha256='a'.repeat(64)],
  ['prior receipt substitution',f=>f.disk.set(f.original.performanceUpdate.backupReceipt,jsonBytes({foreign:true}))],
  ['prior native substitution',f=>f.disk.set(f.original.performanceUpdate.backupNativeReceipt,jsonBytes({foreign:true}))],
  ['original writer mismatch',f=>f.tx.originalWriterSetting='0'],
  ['writer installation substitution',f=>f.disk.set(f.writerFile,jsonBytes({schemaVersion:1,id:f.c.id+'-writer-toggle',descriptorSha256:f.c.descriptor,installationIdentity:'foreign',phase:'completed',from:null,to:'0',createdAtMs:1,createdAt:'fixture',quiescenceAt:'fixture',gatewayStartAttempted:true}))],
 ])test(prefix+': rejects '+name,async()=>{const f=fixture(subject,kind);mutate(f);await assert.rejects(f.run);});
 for(const phase of ['completed','rolled_back'])test(prefix+': bound writer journal '+phase,async()=>{const f=fixture(subject,kind);f.disk.set(f.writerFile,jsonBytes({schemaVersion:1,id:f.c.id+'-writer-toggle',descriptorSha256:f.c.descriptor,installationIdentity:'bound-prior-installation',phase,from:null,to:'0',createdAtMs:1,createdAt:'fixture',quiescenceAt:'fixture',gatewayStartAttempted:true}));await f.run();assert.equal(f.context.previousWriterSetting,phase==='completed'?'0':null);});
}

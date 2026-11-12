// Extract exact frozen updater functions. Never executes installer top-level.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {parse} from '../parser.mjs';
export const hash=b=>createHash('sha256').update(b).digest('hex');
export const jsonBytes=o=>Buffer.from(JSON.stringify(o,null,2)+'\n');
export const err=code=>Object.assign(Error(code),{code,perfDiagnostic:true});
export const check=(ok,code)=>{if(!ok)throw err(code);};
export const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../../..');
const compositionPath=process.env.COL_R11_DELIVERY_COMPOSITION??path.join(ROOT,'scripts/perf-r11/outputs/delivery-preparation/composition.json');
export const composition=JSON.parse(await fs.readFile(compositionPath));
assert.equal(composition.variants.length,3);
const expectedBases={
 'live-r10':['d218c108d230c4e6f32330ece9d622ea883b7fc7502cad15dfe882e0c3c90937','b81247615bfc8bc6ec9fd1765908fcf8912c58550a80906e3710343b907c5656'],
 'live-r10-video':['5df9adae6995d1ad5d7408312c64869e47190af95a2c416d08960fb86ec41e1a','3d68e6d71457bc01e38f43b99d095be1c9c5f6abe6ce8cf240e92963c90a82fb'],
 'test-r10':['c7132f1f6268eedca29539bc529c2a1e0ac07ebd025d683e25c742532f074c79'],
};
export const sources={};
for(const row of composition.variants){
 const name=row.name;assert(expectedBases[name]);assert.equal(row.previousControllerManifestSha256,expectedBases[name][0]);
 const directory=path.resolve(ROOT,row.path),source=await fs.readFile(path.join(directory,'update.mjs'),'utf8'),descriptorBytes=await fs.readFile(path.join(directory,'descriptor.json'));
 assert.equal(hash(source),row.updaterSha256);assert.equal(hash(descriptorBytes),row.descriptorSha256);assert.ok(!source.includes('NOT_FROZEN'));
 const descriptor=JSON.parse(descriptorBytes);assert.equal(descriptor.previousManifestSha256,expectedBases[name][0]);if(row.role==='live')assert.equal(descriptor.native.previousManifestSha256,expectedBases[name][1]);
 const ast=parse(source,{ecmaVersion:'latest',sourceType:'module'}),functions=new Map(ast.body.filter(n=>n.type==='FunctionDeclaration').map(n=>[n.id.name,source.slice(n.start,n.end)]));
 const literals={};for(const n of ast.body)if(n.type==='VariableDeclaration')for(const d of n.declarations)if(d.id.type==='Identifier'&&d.init?.type==='Literal')literals[d.id.name]=d.init.value;
 const featureAPI=row.role==='live'?await import(pathToFileURL(path.join(directory,'feature-settings-r11.mjs'))):{};
 const featureContext=row.role==='live'?{FEATURE_DEFINITIONS:descriptor.featureFlags,FEATURE_CONTRACT:featureAPI.perfR11FeatureContract(descriptor.featureFlags)}:{};
 const base={...featureAPI,...featureContext,Buffer,Map,Set,Date,path,structuredClone,JSON,hash,jsonBytes,check,err,hex:v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v),same:(a,b)=>JSON.stringify(a)===JSON.stringify(b),parseJSON:b=>JSON.parse(b.toString()),now:()=> '2026-10-07T15:00:00.000Z',console:{log(){},error(){}},...literals};
 const evaluate=(code,expression,env={})=>new vm.Script(code+'\n'+expression).runInContext(vm.createContext({...base,...env}),{timeout:1000});
 const run=(names,env={})=>evaluate(names.map(n=>{assert(functions.has(n),'missing '+n);return functions.get(n);}).join('\n'),'({'+names.join(',')+'})',env);
 const block=(start,end)=>{const i=source.indexOf(start),j=source.indexOf(end,i+start.length);assert(i>=0&&j>i,'missing block');assert.equal(source.indexOf(start,i+start.length),-1,'ambiguous block');return source.slice(i,j);};
 sources[name]={name,directory,source,functions,literals,descriptorBytes,descriptor,sourceSha:row.updaterSha256,descriptorSha:row.descriptorSha256,featureAPI,featureContext,run,evaluate,block};
}

import fs from 'node:fs';
import {adaptDungeonTower} from './adapt-adventure-generated.mjs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {parse} from '../perf-r11/tests/parser.mjs';

const root=process.env.COL_CORE511_BASE??path.resolve(import.meta.dirname,'../../../native510-bb3a6cc689c6');
const out=process.env.COL_CORE511_RULE_OUTPUT??path.join(import.meta.dirname,'generated');
const hash=x=>createHash('sha256').update(x).digest('hex');
const manifestBytes=fs.readFileSync(path.join(root,'realm-package-manifest.json'));
const baseline='bb3a6cc689c695d97f127a2eefb9ad141b0e655eb39bbebeea5f05704074ad3b';
if(hash(manifestBytes)!==baseline)throw Error('Exact V510 baseline required');
const manifest=JSON.parse(manifestBytes),proof={baselineManifestSha256:baseline,modules:[],integrationComplete:false};
fs.mkdirSync(out,{recursive:true});
for(const [name,factory,output]of [['solo-dungeon-engine.mjs','createSoloRules','solo-rules.mjs'],['dungeon-engine.mjs','createDungeonRules','dungeon-rules.mjs']]){
 const file='vds-server/src/'+name,bytes=fs.readFileSync(path.join(root,file));
 if(manifest.files.find(row=>row.path===file)?.sha256!==hash(bytes))throw Error('Changed V510 dungeon source');
 const source=bytes.toString(),ast=parse(source,{ecmaVersion:'latest',sourceType:'module'});
 const imports=[],body=[],exports=[],bindings=[];
 for(const node of ast.body){
  if(node.type==='ImportDeclaration'){
   if(node.source.value==='node:crypto')continue;
   if(node.source.value==='./solo-dungeon-engine.mjs'){
    imports.push("import {createSoloRules} from './solo-rules.mjs';");
    bindings.push('const {'+node.specifiers.map(x=>x.local.name).join(',')+'}=createSoloRules({randomUUID,randomInt,globals,progressionSettings});');
    continue;
   }
   const relative=path.relative(out,path.resolve(root,path.dirname(file),node.source.value));
   let declaration=source.slice(node.start,node.end).replace(source.slice(node.source.start,node.source.end),JSON.stringify(relative.startsWith('.')?relative:'./'+relative));
   if(node.specifiers.some(x=>x.local.name==='progressionSettings'))declaration=declaration.replace('{progressionSettings}','{progressionSettings as nativeProgressionSettings}');
   imports.push(declaration);continue;
  }
  const declaration=node.type==='ExportNamedDeclaration'?node.declaration:node;
  if(node.type==='ExportNamedDeclaration'){
   if(!declaration?.id?.name)throw Error('Unexpected export in '+file);
   exports.push(declaration.id.name);
  }
  body.push(source.slice(declaration.start,declaration.end));
 }
 const defaults=name==='solo-dungeon-engine.mjs'?'nativeProgressionSettings':'undefined';
 let projection='';
 if(name==='dungeon-engine.mjs'){
  const klass=ast.body.find(n=>n.type==='ExportNamedDeclaration'&&n.declaration?.id?.name==='DungeonEngine').declaration;
  const method=klass.body.body.find(n=>n.key.name==='publicRun');if(!method)throw Error('Dungeon projection missing');
  const original=source.slice(method.value.body.start,method.value.body.end),filter="const hidden = new Set(r.members.filter(p => p.gmInvisible && p.id !== viewerId).map(p => p.id));";
  if(original.split(filter).length!==2)throw Error('Dungeon visibility boundary changed');
  // Project every member exactly once. The original per-viewer visibility
  // filter is applied to this private shared result before any network send.
  projection='function projectDungeonAll(r)'+original.replace(filter,'const hidden = new Set();');
 }
 let generated=["import {randomUUID as nativeUUID,randomInt as nativeInt} from 'node:crypto';",...imports,
  'const ambient=globalThis;',
  `export function ${factory}({randomUUID=nativeUUID,randomInt=nativeInt,globals=ambient,progressionSettings=${defaults}}={}){`,
  'const globalThis=globals;',...bindings,...body,projection,'return {'+exports.concat(name==='dungeon-engine.mjs'?['GROUP_RULES','DUNGEON_DEFAULTS','projectDungeonAll']:[]).join(',')+'};','}',''].join('\n');
 const extractedSha256=hash(generated);if(name==='dungeon-engine.mjs')generated=adaptDungeonTower(generated);
 parse(generated,{ecmaVersion:'latest',sourceType:'module'});
 fs.writeFileSync(path.join(out,output),generated);
 proof.modules.push({source:file,sourceSha256:hash(bytes),generated:output,generatedSha256:hash(generated),extractedSha256,...(name==='dungeon-engine.mjs'?{adaptation:'count-checked R18 tower hooks; ordinary solo/group rules retained'}:{}),
  declarations:body.map(text=>({bytes:Buffer.byteLength(text),sha256:hash(text)})),exports});
}
fs.writeFileSync(path.join(out,'dungeon-proof.json'),JSON.stringify(proof,null,2)+'\n');
console.log(JSON.stringify({modules:proof.modules.length,rules:'pinned V510 declarations plus explicit count-checked R18 tower integration'}));

import fs from 'node:fs';import path from 'node:path';import {createHash} from 'node:crypto';
import {parse} from '../working/core511-source/scripts/perf-r11/tests/parser.mjs';
const root=path.resolve(import.meta.dirname,'..'),base=root+'/../r70_motion_work',core=root+'/working/core511-source/scripts/core511',before=base+'/working/core511-source/scripts/core511',out=core+'/generated/client',hash=s=>createHash('sha256').update(s).digest('hex');
const proof=JSON.parse(fs.readFileSync(before+'/generated/native-client-proof.json')),source=fs.readFileSync(before+'/generated/client/'+proof.name,'utf8'),edits=[];if(hash(source)!==proof.patchedSha256)throw Error('R70 client hash');let output=source;
function replace(from,to,count=1){if(output.split(from).length!==count+1)throw Error('R71 main anchor: '+from.slice(0,90));output=output.split(from).join(to);edits.push({from,to,count});}
replace('l5 = rt2 || nt3 ? `enemy` : it2 && r6.arena_team > 0 ?', 'l5 = isMistArea511(Fe2) ? colPartyFriendly502(i4,r6.id) ? `ally` : `enemy` : rt2 || nt3 ? `enemy` : it2 && r6.arena_team > 0 ?');
// Player labels format rank/level separately and previously forced the name
// back to white. Pass an explicit Mist-only tint through both label renderers.
replace('colPumpkin499 = false, colMountR49) {','colPumpkin499 = false, colMountR49, nameColorR71) {');
replace('mountStateR49(r6)), colDrawDizzy481(n3, v3.x','mountStateR49(r6), isMistArea511(Fe2) ? l5 === `enemy` ? `#ff4457` : `#75d8ff` : void 0), colDrawDizzy481(n3, v3.x');
replace('Fd(e3, i2, n2, He2, false, true)','Fd(e3, i2, n2, He2, false, true, nameColorR71)');
replace('function Fd(e3, t2, n2, r2, i2 = false, a2 = false) {','function Fd(e3, t2, n2, r2, i2 = false, a2 = false, nameColorR71) {');
replace('rank489?.[2] ?? "#ffe45c", o2?.zoom);','rank489?.[2] ?? "#ffe45c", o2?.zoom, nameColorR71);');
replace('e3.fillStyle = `#ffffff`, e3.fillText(s3[3]','e3.fillStyle = nameColorR71 ?? `#ffffff`, e3.fillText(s3[3]');
replace('function colDrawRankName489(ctx, parts, x2, y2, baseSize, color, zoom) {','function colDrawRankName489(ctx, parts, x2, y2, baseSize, color, zoom, nameColorR71) {');
replace('ctx.fillStyle = "#ffffff";\n  ctx.fillText(parts[3]','ctx.fillStyle = nameColorR71 ?? "#ffffff";\n  ctx.fillText(parts[3]');
const resume=fs.readFileSync(core+'/dungeon-motion-resume-r71.mjs','utf8').replace('export function','function');
replace('var xp = (e3, t2, n2)',resume+'\nvar xp = (e3, t2, n2)');
replace('    let i2 = this.run, a2 = this.me;\n    if (!i2 || !a2) return;', '    let i2 = this.run, a2 = this.me;\n    if (!i2 || !a2) return;\n    if (resumeDungeonMotionR71(this,e3,Sp)) t2 = 0;');
parse(output,{ecmaVersion:'latest',sourceType:'module'});let inverse=output;for(const {from,to,count} of edits.toReversed()){if(inverse.split(to).length!==count+1)throw Error('main inverse count');inverse=inverse.split(to).join(from);}if(inverse!==source)throw Error('main inverse');
const name='game-client-core511-r71-'+hash(output).slice(0,16)+'.js';fs.writeFileSync(out+'/'+name,output);
const next={...proof,name,patchedSha256:hash(output),r71Gameplay:{oldName:proof.name,name,sourceSHA256:hash(source),edits,inverseEqual:true,files:[{name,bytes:Buffer.byteLength(output),sha256:hash(output)}]}};fs.writeFileSync(core+'/generated/native-client-proof.json',JSON.stringify(next,null,2)+'\n');
const namespace='core511-'+createHash('sha256').update(fs.readFileSync(core+'/client-assets.mjs')).update(JSON.stringify(next)).digest('hex').slice(0,16),httpProof=JSON.parse(fs.readFileSync(before+'/generated/native-http-composition-proof.json')),oldNamespace=httpProof.clientAssetNamespace,oldHttp=fs.readFileSync(base+'/payload/http-runtime/dist-vds/server/index.js','utf8');if(hash(oldHttp)!==httpProof.generatedSha256)throw Error('R70 HTTP hash');
const http=oldHttp.replaceAll(oldNamespace,namespace).replaceAll(proof.name,name);if(http.replaceAll(namespace,oldNamespace).replaceAll(name,proof.name)!==oldHttp)throw Error('HTTP inverse');fs.writeFileSync(root+'/payload/http-runtime/dist-vds/server/index.js',http);
fs.writeFileSync(core+'/generated/native-http-composition-proof.json',JSON.stringify({...httpProof,generatedSha256:hash(http),clientAssetNamespace:namespace,r71Gameplay:{oldNamespace,namespace,oldName:proof.name,name,inverseEqual:true,scope:'Immutable browser references; authoritative HTTP mutations retained.'}},null,2)+'\n');
fs.writeFileSync(root+'/evidence/client-build.json',JSON.stringify({oldName:proof.name,name,oldNamespace,namespace,generatedNames:[name],inverseEqual:true},null,2)+'\n');console.log(JSON.stringify({name,namespace}));

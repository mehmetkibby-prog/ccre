// Incremental R40 graph extension. Never rebuilds native V510 or rewrites old assets.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {patchR41BagClient} from './patch-r41-bag-client.mjs';
import {reverseR40Edits} from './patch-r40-client.mjs';
const home=path.dirname(fileURLToPath(import.meta.url)),baseline=process.argv[2];
if(!baseline)throw Error('usage: node build-r41-bag-client.mjs <verified-r40-core-directory>');
const hash=value=>createHash('sha256').update(value).digest('hex'),read=(base,name)=>fs.readFileSync(path.join(base,name),'utf8');
const proofText=read(baseline,'generated/native-client-proof.json'),proof=JSON.parse(proofText);
if(hash(proofText)!=='9717139c9471601d40ea9a41233f006598f8c39abdf741be86698445e43b6a87'||!proof.r40||proof.r41Bag)throw Error('r41_wrong_r40_graph');
const oldGame=read(baseline,'generated/client/'+proof.name),oldPortal=read(baseline,'generated/client/'+proof.portal.name);
if(hash(oldGame)!==proof.patchedSha256||hash(oldPortal)!==proof.portal.patchedSha256)throw Error('r41_wrong_live_assets');
const namespace='core511-'+createHash('sha256').update(fs.readFileSync(path.join(baseline,'client-assets.mjs'))).update(JSON.stringify(proof)).digest('hex').slice(0,16);
const helperSource=read(home,'r41-bag-client.mjs'),helper=helperSource.replace("'./r40-client.mjs'","'./"+proof.r40.helper.name+"'"),helperName='core511-r41-bag-'+hash(helper).slice(0,16)+'.js';
const game=patchR41BagClient(oldGame,helperName),gameName='game-client-core511-'+hash(game.source).slice(0,16)+'.js';
if(reverseR40Edits(game.source,game.proof.edits)!==oldGame)throw Error('r41_bag_client_inverse_failed');
const portalEdits=[{from:proof.name,to:gameName,count:oldPortal.split(proof.name).length-1}];if(portalEdits[0].count!==2)throw Error('r41_portal_reference_count');
const portal=oldPortal.replaceAll(proof.name,gameName),portalName='auth-portal-core511-'+hash(portal).slice(0,16)+'.js';
if(reverseR40Edits(portal,portalEdits)!==oldPortal)throw Error('r41_portal_inverse_failed');
for(const value of [helper,game.source,portal])execFileSync(process.execPath,['--check','--input-type=module'],{input:value,stdio:['pipe','pipe','pipe']});
const next={...proof,name:gameName,patchedSha256:hash(game.source),portal:{...proof.portal,name:portalName,patchedSha256:hash(portal)},r41Bag:{baseline:{gameName:proof.name,gameSHA256:hash(oldGame),portalName:proof.portal.name,portalSHA256:hash(oldPortal),proofSHA256:hash(proofText),namespace},helper:{name:helperName,sha256:hash(helper),source:'r41-bag-client.mjs',sourceSha256:hash(helperSource)},game:game.proof,portal:{sourceSha256:hash(oldPortal),patchedSha256:hash(portal),edits:portalEdits}}};
const assets=[[helperName,helper],[gameName,game.source],[portalName,portal]];
for(const [name,value]of assets){const file=path.join(home,'generated/client',name);if(fs.existsSync(file)&&read(home,'generated/client/'+name)!==value)throw Error('r41_immutable_asset_collision');fs.writeFileSync(file,value);}
fs.writeFileSync(path.join(home,'generated/native-client-proof.json'),JSON.stringify(next,null,2)+'\n');
console.log(JSON.stringify({baselineNamespace:namespace,namespace:'core511-'+createHash('sha256').update(fs.readFileSync(path.join(home,'client-assets.mjs'))).update(JSON.stringify(next)).digest('hex').slice(0,16),assets:assets.map(([name])=>name)},null,2));

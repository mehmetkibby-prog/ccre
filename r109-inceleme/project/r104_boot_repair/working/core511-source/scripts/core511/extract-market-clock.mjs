import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {parse} from '../perf-r11/tests/parser.mjs';
const hash=x=>createHash('sha256').update(x).digest('hex'),root=process.env.COL_CORE511_BASE??path.resolve(import.meta.dirname,'../../../native510-bb3a6cc689c6'),out=path.join(import.meta.dirname,'generated');
const baseline='bb3a6cc689c695d97f127a2eefb9ad141b0e655eb39bbebeea5f05704074ad3b',bytes=fs.readFileSync(path.join(root,'realm-package-manifest.json'));if(hash(bytes)!==baseline)throw Error('Exact V510 required');
const sourceFile='dist-vds/server/channel-runtime/index.mjs',source=fs.readFileSync(path.join(root,sourceFile),'utf8');if(JSON.parse(bytes).files.find(r=>r.path===sourceFile)?.sha256!==hash(source))throw Error('Native market source changed');
const literals=[];function walk(n){if(!n||typeof n!=='object')return;if(n.type==='TemplateLiteral'&&n.expressions.length===0&&n.quasis[0].value.cooked.includes('AS stock_count502'))literals.push(n);for(const v of Object.values(n))if(Array.isArray(v))v.forEach(walk);else if(v?.type)walk(v);}
walk(parse(source,{ecmaVersion:'latest',sourceType:'module'}));if(literals.length!==1)throw Error('Native shop projection boundary drift');
const node=literals[0],query=node.quasis[0].value.cooked,match=/created_at>CAST\(strftime\('%s','now'\) AS INTEGER\)-(\d+)/.exec(query);if(!match)throw Error('Native shop lifetime predicate drift');
const lifetime=Number(match[1]);if(!Number.isSafeInteger(lifetime)||lifetime<=0)throw Error('Native shop lifetime');
const generated='// Derived from the exact native cold-world SQL lifetime predicate.\nexport const MARKET_SHOP_LIFETIME_SECONDS='+lifetime+';\nexport const marketShopDeadline=row=>(Number(row.created_at)+MARKET_SHOP_LIFETIME_SECONDS)*1000;\nexport function liveMarketShops(rows,nowMs){if(!Array.isArray(rows))return rows;const cutoff=Math.floor(nowMs/1000)-MARKET_SHOP_LIFETIME_SECONDS;return rows.every(row=>Number(row.created_at)>cutoff)?rows:rows.filter(row=>Number(row.created_at)>cutoff);}\n';
fs.writeFileSync(path.join(out,'market-clock-rules.mjs'),generated);fs.writeFileSync(path.join(out,'market-clock-proof.json'),JSON.stringify({baselineManifestSha256:baseline,source:sourceFile,sourceSha256:hash(source),start:node.start,end:node.end,querySha256:hash(query),predicate:match[0],lifetimeSeconds:lifetime,generatedSha256:hash(generated),edits:['Native strict seconds-based creation-time predicate on already authorized public shop rows; no other visibility, stock or player state recalculation']},null,2)+'\n');

import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {parse} from '../perf-r11/tests/parser.mjs';
const root=process.env.COL_CORE511_BASE??path.resolve(import.meta.dirname,'../../../native510-bb3a6cc689c6'),out=path.join(import.meta.dirname,'generated'),hash=x=>createHash('sha256').update(x).digest('hex');
const bytes=fs.readFileSync(path.join(root,'realm-package-manifest.json')),baseline='bb3a6cc689c695d97f127a2eefb9ad141b0e655eb39bbebeea5f05704074ad3b';if(hash(bytes)!==baseline)throw Error('Exact V510 baseline required');
const manifest=JSON.parse(bytes),sources=[];
function read(file){const source=fs.readFileSync(path.join(root,file),'utf8');if(manifest.files.find(r=>r.path===file)?.sha256!==hash(source))throw Error('Native guard mismatch '+file);sources.push({file,sha256:hash(source)});return source;}
function predicate(file){
 const source=read(file),ast=parse(source,{ecmaVersion:'latest',sourceType:'module'}),node=ast.body.flatMap(n=>(n.declaration??n).declarations??[]).find(n=>n.id.name==='eligibleHit')?.init;
 if(node?.type!=='TemplateLiteral'||node.expressions.some(n=>n.type!=='Identifier'||n.name!=='eligible'))throw Error('Native hit predicate changed');
 const sql=node.quasis.map((q,i)=>q.value.cooked+(i<node.expressions.length?'coldEligible':'')).join('');return {sql,source:source.slice(node.start,node.end)};
}
// This deliberately small compiler accepts only the operators/columns present
// in the two pinned native CASE predicates. Unknown syntax stops extraction.
// Equality and concatenation retain SQL NULL behavior; no gameplay constants
// or account eligibility rule are re-created by the resident implementation.
function compile(sql){
 const tokens=[],re=/\s*((?:actor|victim)\.[a-z_0-9]+|coldEligible|'(?:[^']|'')*'|\d+|\|\||[=><()]|AND\b|OR\b)/gy;let at=0,m;
 while(at<sql.length){re.lastIndex=at;m=re.exec(sql);if(!m)throw Error('Unsupported native predicate '+sql.slice(at));tokens.push(m[1]);at=re.lastIndex;}
 let i=0;const take=s=>tokens[i]===s?(i++,true):false;
 function atom(){const t=tokens[i++];if(t==='('){const v=or();if(!take(')'))throw Error('Unclosed native predicate');return v;}if(t==='coldEligible')return '(runeEligible===true)';if(/^(actor|victim)\.[a-z_0-9]+$/.test(t))return t;if(/^\d+$/.test(t))return t;if(t?.startsWith("'"))return JSON.stringify(t.slice(1,-1).replaceAll("''","'"));throw Error('Unknown native operand '+t);}
 function concat(){let v=atom();while(take('||'))v=`cat(${v},${atom()})`;return v;}
 function comparison(){let v=concat();if(take('='))v=`eq(${v},${concat()})`;else if(take('>'))v=`gt(${v},${concat()})`;return v;}
 function and(){let v=comparison();while(take('AND'))v=`(${v}&&${comparison()})`;return v;}
 function or(){let v=and();while(take('OR'))v=`(${v}||${and()})`;return v;}
 const code=or();if(i!==tokens.length)throw Error('Unused native predicate tokens');return code;
}
const rune=predicate('lib/rune-v2-ranking.mjs'),dragon=predicate('lib/dragon-ranking498.mjs');
read('lib/stone-boss-ranking476.mjs');
const rel=file=>JSON.stringify(path.relative(out,path.join(root,file)));
const generated=`// Compiled from the exact native participant CASE predicates; only C4 IDs extend.
export {runeV2RealPlayerSql483} from ${rel('lib/rune-v2-ranking.mjs')};
const eq=(a,b)=>a!=null&&b!=null&&a===b,gt=(a,b)=>a!=null&&b!=null&&a>b,cat=(a,b)=>a==null||b==null?null:String(a)+String(b);
export function nativeRankedHit(actor,victim,runeEligible){
 if(/^stone-boss-black-c[1-4]$/.test(victim.id))return true;
 if(victim.id==='dragon-world-1')return ${compile(dragon.sql)};
 if(/^rune-v2-boss-c[1-4]-1$/.test(victim.id))return ${compile(rune.sql)};
 return false;
}
`;
parse(generated,{ecmaVersion:'latest',sourceType:'module'});fs.writeFileSync(path.join(out,'combat-guards.mjs'),generated);
fs.writeFileSync(path.join(out,'combat-guards-proof.json'),JSON.stringify({baselineManifestSha256:baseline,sources,predicates:[{kind:'dragon',source:dragon.source,sha256:hash(dragon.source)},{kind:'rune_v2',source:rune.source,sha256:hash(rune.source)}],generatedSha256:hash(generated),edits:['Native dragon and RuneV2 hit CASE predicates compiled into synchronous resident comparisons','Native RuneV2 account/lab eligibility SELECT runs only in the fenced cold snapshot','Native black-stone participant scoring has no additional eligibility predicate','Only fixed native channel identifiers extend to4']},null,2)+'\n');

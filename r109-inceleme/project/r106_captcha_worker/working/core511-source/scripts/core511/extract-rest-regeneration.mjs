import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {parse} from '../perf-r11/tests/parser.mjs';
const hash=x=>createHash('sha256').update(x).digest('hex'),root=process.env.COL_CORE511_BASE??path.resolve(import.meta.dirname,'../../../native510-bb3a6cc689c6'),out=path.join(import.meta.dirname,'generated'),baseline='bb3a6cc689c695d97f127a2eefb9ad141b0e655eb39bbebeea5f05704074ad3b',bytes=fs.readFileSync(path.join(root,'realm-package-manifest.json'));
if(hash(bytes)!==baseline)throw Error('Exact V510 required');const manifest=JSON.parse(bytes),file='lib/rest-regeneration.ts',source=fs.readFileSync(path.join(root,file),'utf8');if(manifest.files.find(r=>r.path===file)?.sha256!==hash(source))throw Error('Native rest regeneration changed');
const ast=parse(source,{ecmaVersion:'latest',sourceType:'module'}),declarations=ast.body.map(n=>n.declaration??n);if(declarations.length!==4||declarations.some(n=>n.type!=='VariableDeclaration'))throw Error('Native rest declarations changed');
const sql=Function(declarations.map(n=>source.slice(n.start,n.end)).join('\n')+'\nreturn REST_REGEN_SQL;')();
// Build-time compiler for this pinned numeric expression only. It accepts no
// arbitrary SQL, strings, subqueries, runtime eval or nullable input columns.
const fields=new Set(),parameters=new Set(),operators={OR:[1,'||'],AND:[2,'&&'],'=':[3,'==='],'>':[3,'>'],'<':[3,'<'],'>=':[3,'>='],'<=':[3,'<='],'+':[4,'+'],'-':[4,'-'],'*':[5,'*'],'/':[5,'/']};
function compile(text){
 const tokens=[],pattern=/\s+|\?\d+|\d+(?:\.\d+)?|[A-Za-z_]\w*|>=|<=|[=><+*/(),-]/y;let offset=0;
 while(offset<text.length){pattern.lastIndex=offset;const match=pattern.exec(text);if(!match)throw Error('Unsupported rest expression at '+text.slice(offset));offset=pattern.lastIndex;if(match[0].trim())tokens.push(match[0]);}
 let cursor=0;const take=()=>tokens[cursor++],expect=word=>{if(take()!==word)throw Error('Expected rest token '+word);};
 function expression(min=0){
  const token=take();let value;
  if(token==='CASE'){expect('WHEN');const condition=expression();expect('THEN');const yes=expression();expect('ELSE');const no=expression();expect('END');value='('+condition+'?'+yes+':'+no+')';}
  else if(token==='CAST'){expect('(');const argument=expression();expect('AS');expect('INTEGER');expect(')');value='(Math.trunc('+argument+')||0)';}
  else if(['MAX','MIN','ROUND'].includes(token)){
   expect('(');const args=[expression()];while(tokens[cursor]===','){take();args.push(expression());}expect(')');
   if(token==='ROUND'){if(args.length!==1)throw Error('Native ROUND arity changed');value='Math.floor(('+args[0]+')+0.5)';}
   else value='Math.'+token.toLowerCase()+'('+args.join(',')+')';
  }else if(token==='('){value=expression();expect(')');value='('+value+')';}
  else if(/^\?\d+$/.test(token)){const n=Number(token.slice(1));if(![1,3,4,5].includes(n))throw Error('Unexpected rest parameter');parameters.add(n);value='bindings['+(n-1)+']';}
  else if(/^\d+(?:\.\d+)?$/.test(token))value=token;
  else if(/^[a-z_]\w*$/.test(token)){fields.add(token);value='player.'+token;}
  else throw Error('Unsupported rest token '+token);
  while(operators[tokens[cursor]]?.[0]>=min){const [priority,op]=operators[take()],right=expression(priority+1);value='('+value+op+right+')';}return value;
 }
 const result=expression();if(cursor!==tokens.length)throw Error('Remaining rest expression tokens');return result;
}
const body=/^UPDATE players SET ([\s\S]+)\n  WHERE id = \?2 RETURNING hp, max_hp, hp_revision, respawn_at_ms, area, channel, arena_match_id$/.exec(sql)?.[1];if(!body)throw Error('Native rest statement changed');
const assignments=[];let depth=0,start=0;for(let n=0;n<=body.length;n++){if(body[n]==='(')depth++;if(body[n]===')')depth--;if(n===body.length||body[n]===','&&depth===0){assignments.push(body.slice(start,n).trim());start=n+1;}}
const changes=assignments.map(text=>{const row=/^(\w+)\s*=\s*([\s\S]+)$/.exec(text);if(!row)throw Error('Native rest assignment changed');return [row[1],compile(row[2])];});
if(changes.map(([name])=>name).join(',')!=='last_seen,hp,hp_revision,last_regen_at')throw Error('Native rest writes changed');
// The only ROUND is the positive gain branch: hp>0, max_hp>hp, percent>0
// and at least 1000ms elapsed. SQLite half-away rounding equals floor(x+.5).
// The only integer division is enclosed in CAST; every healing division uses
// native 100.0/1000.0. Inputs are the native finite, NOT NULL numeric columns.
const generated='// Mechanically compiled from pinned V510 REST_REGEN_SQL.\nexport const REST_REGEN_SQL='+JSON.stringify(sql)+';\nexport const REST_INPUT_FIELDS=Object.freeze('+JSON.stringify([...fields])+');\nexport function restRegeneration(player,bindings){return {...player,'+changes.map(([name,js])=>name+':'+js).join(',')+'};}\n';
parse(generated,{ecmaVersion:'latest',sourceType:'module'});fs.writeFileSync(path.join(out,'rest-regeneration-rules.mjs'),generated);fs.writeFileSync(path.join(out,'rest-regeneration-proof.json'),JSON.stringify({baselineManifestSha256:baseline,source:file,sourceSha256:hash(source),declarations:declarations.map(n=>({start:n.start,end:n.end,sha256:hash(source.slice(n.start,n.end))})),sqlSha256:hash(sql),generatedSha256:hash(generated),fields:[...fields],parameters:[...parameters],writes:changes.map(([n])=>n),adaptation:'Only native numeric expressions compiled to direct Map row operations; no gameplay constant, condition, rounding domain or update order changed. SQL assignments all read the prior row.'},null,2)+'\n');

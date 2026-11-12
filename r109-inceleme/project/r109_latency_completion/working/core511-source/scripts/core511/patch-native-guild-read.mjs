import {parse} from '../perf-r11/tests/parser.mjs';
import {createHash} from 'node:crypto';
export function patchNativeGuildRead(source){
 const ast=parse(source,{ecmaVersion:'latest',sourceType:'module'}),fn=ast.body.find(n=>n.type==='FunctionDeclaration'&&n.id?.name==='guildSnapshot');
 if(!fn||!source.slice(fn.start,fn.end).includes('guild_ledger_contributions510'))throw Error('guild_snapshot_r19_anchor_changed');
 const body=`{ if(!database.core511GuildReader)throw new Error('guild_read_unavailable');return database.core511GuildReader.read(playerId,details,includeContributions); }`;
 let output=source.slice(0,fn.body.start)+body+source.slice(fn.body.end);
 const old='console.error("Guild read failed", error);';if(output.split(old).length!==2)throw Error('guild_read_log_anchor_changed');output=output.replace(old,'/* The read-only worker emits one redacted family/stack diagnostic. */');
 parse(output,{ecmaVersion:'latest',sourceType:'module'});return {source:output,proof:{sourceSha256:createHash('sha256').update(source).digest('hex'),patchedSha256:createHash('sha256').update(output).digest('hex'),operation:'guild_snapshot',indexMigration:false,readOnly:true,separateQueue:true,automaticRetry:false}};
}

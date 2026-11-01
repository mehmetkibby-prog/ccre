// D1 bind(...values) addresses SQLite's numeric parameter slots. Preserve
// those slots without rewriting native SQL, while mapping genuine named
// parameters to node:sqlite's named object. Ordinary SQL retains its direct
// path, without per-execution allocation or parameter transformation.
import {r43Options} from './r43-options.mjs';
const digit=c=>c>='0'&&c<='9';
const identifier=c=>!!c&&(/[A-Za-z0-9_$]/.test(c)||c.charCodeAt(0)>=128);
export function nativeParameterBinder(sql){
 if(!/\?[0-9]/.test(sql))return null;
 const names=new Map(),slots=new Map();let maximum=0,numbered=false;
 for(let i=0;i<sql.length;){
  const c=sql[i],next=sql[i+1];
  if(c==='\''||c==='"'||c==='`'){
   const quote=c;i++;
   while(i<sql.length){if(sql[i++]!==quote)continue;if(sql[i]===quote){i++;continue;}break;}
   continue;
  }
  if(c==='['){i++;while(i<sql.length&&sql[i]!==']')i++;i++;continue;}
  if(c==='-'&&next==='-'){i+=2;while(i<sql.length&&sql[i]!=='\n')i++;continue;}
  if(c==='/'&&next==='*'){i+=2;while(i<sql.length&&!(sql[i]==='*'&&sql[i+1]==='/'))i++;i+=2;continue;}
  if(c==='?'){
   const start=i++;while(digit(sql[i]))i++;
   if(i===start+1){maximum++;continue;}
   const name=sql.slice(start,i),index=Number(name.slice(1));numbered=true;
   // SQLite prepare, which runs before this helper in the adapter, rejects
   // zero/out-of-range indices. Also fail closed for direct helper callers.
   if(!Number.isSafeInteger(index)||index<1)throw Error('native_parameter_index');
   maximum=Math.max(maximum,index);if(!slots.has(index))slots.set(index,name);
   continue;
  }
  if(c===':'||c==='@'||c==='$'){
   const start=i++;while(identifier(sql[i]))i++;
   while(sql[i]===':'&&sql[i+1]===':'){i+=2;while(identifier(sql[i]))i++;}
   if(sql[i]==='('){i++;while(i<sql.length&&sql[i]!==')')i++;if(sql[i]===')')i++;}
   if(i===start+1)continue;
   const name=sql.slice(start,i);
   if(!names.has(name)){names.set(name,++maximum);slots.set(maximum,name);}
   continue;
  }
  // A dollar sign may be part of an unquoted identifier (e.g. item$old).
  // Consume the entire token so its suffix cannot become a fake parameter.
  if(/[A-Za-z_]/.test(c)||c.charCodeAt(0)>=128){i++;while(identifier(sql[i]))i++;continue;}
  i++;
 }
 if(!numbered)return null;
 return values=>{
  const named=Object.create(null),positional=[];
  for(let i=0;i<values.length;i++){
   // node:sqlite consumes ?NNN through its positional slots too. Supplying
   // ?1 as a named value and omitting positional slot 1 shifts later values
   // over it (and silently leaves the final slot NULL). Genuine :/@/$ names
   // still use the named object. Keep the previous mapping behind flag 0.
   const name=slots.get(i+1);if(name&&!(r43Options.nativeParameterSlots&&name[0]==='?'))named[name]=values[i];else positional.push(values[i]);
  }
  return [named,...positional];
 };
}

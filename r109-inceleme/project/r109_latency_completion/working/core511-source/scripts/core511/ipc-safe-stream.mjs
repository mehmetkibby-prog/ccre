// Read once at process startup; changed only by the maintenance installer.
export const ipcSafeStream=process.env.CORE511_IPC_SAFE_STREAM!=='0';
const reported=new Set(),names=new Set(['Error','TypeError','RangeError','ReferenceError','SyntaxError','URIError','EvalError','AggregateError']);
const methodName=value=>typeof value==='string'&&/^[a-zA-Z0-9_.:-]{1,80}$/.test(value)?value:'unknown';
export function ipcDiagnostic(code,{method,error,bytes}={}){
 if(!ipcSafeStream)return;
 const methodKey=methodName(method),key=code+':'+methodKey;if(reported.has(key)||reported.size>=32)return;reported.add(key);
 const detail={type:'core511_ipc_safe_stream',code,method:methodKey};
 if(Number.isSafeInteger(bytes)&&bytes>=0)detail.bytes=bytes;
 if(error!==undefined){
  detail.name=names.has(error?.name)?error.name:'Error';
  // Never emit an error message, payload, URL, absolute path or stack argument.
  // Preserve only the first three stack positions and sanitized code locations.
  detail.stack=[detail.name+': [message omitted]',...String(error?.stack??'').split('\n').slice(1,3).map(line=>{
   const match=/([a-zA-Z0-9_-]+\.(?:mjs|cjs|js)):(\d+):(\d+)\)?$/.exec(line.trim());
   return match?'at '+match[1]+':'+match[2]+':'+match[3]:'at [location omitted]';
  })];
 }
 console.warn(JSON.stringify(detail));
}

// Keep allocation/revision and hydration order identical. Only the number of
// simultaneously outstanding cold reads changes; no new SQL or timer is added.
export async function readActorBatches(players,load){
 const rows=[];for(let start=0;start<players.length;start+=4)rows.push(...await Promise.all(players.slice(start,start+4).map(load)));return rows;
}

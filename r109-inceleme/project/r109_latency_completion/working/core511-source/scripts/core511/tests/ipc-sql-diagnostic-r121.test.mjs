import test from 'node:test';
import assert from 'node:assert/strict';
test('IPC diagnostic retains numeric SQLite error code without SQL, bound data or paths',async()=>{
 const {ipcDiagnostic}=await import('../ipc-safe-stream.mjs'),logs=[],warn=console.warn;console.warn=x=>logs.push(JSON.parse(x));
 try{ipcDiagnostic('r121_sql_diagnostic',{method:'system_command',error:Object.assign(Error('secret-query account-token /private/path'),{code:'ERR_SQLITE_ERROR',errcode:1811})});}finally{console.warn=warn;}
 assert.equal(logs.length,1);assert.equal(logs[0].sqliteCode,1811);assert.equal(logs[0].sqlitePrimaryCode,19);assert(!JSON.stringify(logs).includes('secret-query'));assert(!JSON.stringify(logs).includes('account-token'));assert(!JSON.stringify(logs).includes('/private/path'));
});

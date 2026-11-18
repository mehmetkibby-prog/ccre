import fs from 'node:fs';
import path from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {prepareCompact,restoreCompact} from './compact.mjs';
const [mode,source,directory,cutoffText]=process.argv.slice(2),GiB=1024**3;
if(!['prepare','install','recover-install'].includes(mode)||!path.isAbsolute(source??'')||!path.isAbsolute(directory??''))throw Error('invalid_arguments');
const report=directory+'/verified.json';
const log=value=>console.log(JSON.stringify(value));
const sync=file=>{const fd=fs.openSync(file,'r');try{fs.fsyncSync(fd);}finally{fs.closeSync(fd);}};
if(mode==='prepare'){
 const original=new DatabaseSync(source,{readOnly:true});
 try{if(original.prepare('PRAGMA journal_mode').get().journal_mode!=='wal')throw Error('wal_required');}finally{original.close();}
 const s=fs.statfsSync(directory),free=s.bavail*s.bsize;
 const verified=prepareCompact(source,directory+'/verified.sqlite',{cutoff:Number(cutoffText),maxBytes:Math.floor((free-2*GiB)/4),onProgress:log});
 fs.writeFileSync(report,JSON.stringify(verified),{flag:'wx',mode:0o600});sync(report);sync(directory);log({phase:'verified',bytes:verified.bytes});
}else{
 const verified=JSON.parse(fs.readFileSync(report));
 if(verified.source!==source||verified.destination!==directory+'/verified.sqlite')throw Error('report_binding_changed');
 const result=await restoreCompact(verified,{onProgress:log,resume:mode==='recover-install'});
 const output=directory+'/installed.json';
 if(!fs.existsSync(output))fs.writeFileSync(output,JSON.stringify(result),{flag:'wx',mode:0o600});sync(output);sync(directory);log({phase:'installed',...result});
}

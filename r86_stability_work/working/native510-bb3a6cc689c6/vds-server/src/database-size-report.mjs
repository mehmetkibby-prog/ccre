import {DatabaseSync} from 'node:sqlite';
import {statSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
// Run against a verified backup, never automatically against the live database.
// dbstat reports allocated pages per table AND index; no private row contents.
export function databaseSizeReport(file){
 if(!path.isAbsolute(file))throw new Error('Absolute verified backup path required');
 const db=new DatabaseSync(file,{readOnly:true});
 try{
  const pageSize=db.prepare('PRAGMA page_size').get().page_size;
  const pageCount=db.prepare('PRAGMA page_count').get().page_count;
  const freePages=db.prepare('PRAGMA freelist_count').get().freelist_count;
  const schema=db.prepare("SELECT name,tbl_name,type FROM sqlite_schema WHERE type IN ('table','index')").all();
  const allocated=db.prepare('SELECT name,sum(pgsize) bytes,sum(unused) unusedBytes FROM dbstat GROUP BY name').all();
  const groups=new Map();
  for(const row of allocated){const meta=schema.find(s=>s.name===row.name),name=meta?.tbl_name??row.name;
   let item=groups.get(name);if(!item){item={table:name,tableBytes:0,indexBytes:0,unusedBytes:0};groups.set(name,item);}
   item[meta?.type==='index'?'indexBytes':'tableBytes']+=Number(row.bytes);item.unusedBytes+=Number(row.unusedBytes);
  }
  return {measuredAt:new Date().toISOString(),source:'explicit-backup-read-only',fileBytes:statSync(file).size,pageSize,pageCount,freePages,freeBytes:freePages*pageSize,
   tables:[...groups.values()].map(r=>({...r,totalBytes:r.tableBytes+r.indexBytes})).sort((a,b)=>b.totalBytes-a.totalBytes)};
 }finally{db.close();}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const file=process.argv[2];if(!file)throw new Error('Usage: node database-size-report.mjs /absolute/verified-backup.sqlite');
 console.log(JSON.stringify(databaseSizeReport(file),null,2));
}

import fs from 'node:fs';
import path from 'node:path';
import {createHash,randomBytes} from 'node:crypto';
import {DatabaseSync,backup} from 'node:sqlite';
import {fileURLToPath} from 'node:url';
const checksum=async file=>{const h=createHash('sha256');for await(const chunk of fs.createReadStream(file))h.update(chunk);return h.digest('hex');};
const sync=file=>{const fd=fs.openSync(file,'r');try{fs.fsyncSync(fd);}finally{fs.closeSync(fd);}};
export async function backupForum(dbFile,directory,{keep=7}={}){
 if(!Number.isInteger(keep)||keep<1||keep>30)throw Error('Yedek sayısı 1–30 olmalı.');
 const dir=path.resolve(directory);fs.mkdirSync(dir,{recursive:true,mode:0o700});
 const name='forum-'+new Date().toISOString().replace(/[:.]/g,'-')+'-'+randomBytes(4).toString('hex')+'.sqlite';
 const file=path.join(dir,name),temp=file+'.partial';
 const source=new DatabaseSync(dbFile,{readOnly:true});
 try{source.exec('PRAGMA busy_timeout=3000');await backup(source,temp,{rate:100});}catch(e){fs.rmSync(temp,{force:true});throw e;}finally{source.close();}
 try{
   fs.chmodSync(temp,0o600);const verified=new DatabaseSync(temp,{readOnly:true});
   try{if(verified.prepare('PRAGMA quick_check').get().quick_check!=='ok')throw Error('Forum yedeği bütünlük kontrolünü geçmedi.');verified.prepare('SELECT count(*) FROM users').get();}finally{verified.close();}
   const sha=await checksum(temp);sync(temp);fs.renameSync(temp,file);
   const meta=file+'.sha256';fs.writeFileSync(meta,sha+'\n',{mode:0o600,flag:'wx'});sync(meta);sync(dir);
   // Only prune our verified backup pairs after a new durable backup exists.
   const prior=fs.readdirSync(dir).filter(n=>/^forum-[0-9TZ-]+-[a-f0-9]{8}\.sqlite$/.test(n)).sort().reverse();
   for(const n of prior.slice(keep)){
     const old=path.join(dir,n),ref=old+'.sha256';
     if(fs.lstatSync(old).isSymbolicLink()||!fs.existsSync(ref)||fs.lstatSync(ref).isSymbolicLink())continue;
     if(fs.readFileSync(ref,'utf8').trim()!==await checksum(old))continue;
     fs.unlinkSync(old);fs.unlinkSync(ref);
   }
   sync(dir);return{file,sha256:sha};
 }finally{fs.rmSync(temp,{force:true});}
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const db=process.env.FORUM_DB;if(!db)throw Error('FORUM_DB gerekli.');
 console.log(JSON.stringify(await backupForum(db,process.env.FORUM_BACKUPS??path.join(path.dirname(db),'backups'))));
}

import {createForum} from './server.mjs';
// Only the local operator can create an admin. Secrets arrive via stdin,
// never in process arguments, environment variables, logs or the ZIP.
const chunks=[];let bytes=0;
for await(const chunk of process.stdin){bytes+=chunk.length;if(bytes>4096)throw Error('Admin girdisi fazla uzun.');chunks.push(chunk);}
const {name,password,email}=JSON.parse(Buffer.concat(chunks));
if(!process.env.FORUM_DB)throw Error('FORUM_DB gerekli.');
const app=await createForum({dbPath:process.env.FORUM_DB});
try{await app.createAdmin(name,password,email);console.log('Forum yöneticisi oluşturuldu.');}finally{await app.close();}

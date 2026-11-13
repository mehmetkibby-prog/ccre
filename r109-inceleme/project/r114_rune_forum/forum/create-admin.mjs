import {createForum} from './server.mjs';
// Local operator-only bootstrap. No public route can create or promote admins.
const {FORUM_DB,FORUM_ADMIN_NAME,FORUM_ADMIN_PASSWORD,FORUM_ADMIN_EMAIL}=process.env;
if(!FORUM_DB||!FORUM_ADMIN_NAME||!FORUM_ADMIN_PASSWORD||!FORUM_ADMIN_EMAIL)throw Error('FORUM_DB ve FORUM_ADMIN_NAME/PASSWORD/EMAIL gerekli.');
const app=await createForum({dbPath:FORUM_DB});
try{await app.createAdmin(FORUM_ADMIN_NAME,FORUM_ADMIN_PASSWORD,FORUM_ADMIN_EMAIL);console.log('Forum yöneticisi oluşturuldu.');}finally{await app.close();}

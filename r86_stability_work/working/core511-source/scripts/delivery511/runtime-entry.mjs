// Deployment wiring only. All gameplay/auth/ownership logic is the frozen698 core.
import fs from 'node:fs';
import path from 'node:path';
const config=JSON.parse(fs.readFileSync(process.env.CORE_CONFIG_FILE,'utf8'));
if(!config.database||config.realm?.role!=='game'||!config.delivery511)throw Error('delivery_runtime_configuration');
Object.assign(process.env,config.environment,{NODE_ENV:'production',CORE_DATABASE_PATH:config.database,VINEXT_TRUST_PROXY:'1',VINEXT_TRUSTED_HOSTS:config.hosts.join(',')});
const {startRuntime}=await import('./runtime-host.mjs');
const runtime=await startRuntime(config);
let closing=false;
for(const signal of ['SIGTERM','SIGINT'])process.once(signal,()=>{
 if(closing)return;closing=true;
 runtime.close().then(()=>process.exit(0),error=>{console.error('delivery_shutdown',error.code??error.message);process.exit(1);});
});
console.log(JSON.stringify({core511Ready:true,channels:4,capacity:25,pid:process.pid,release:path.basename(config.delivery511.releaseRoot)}));

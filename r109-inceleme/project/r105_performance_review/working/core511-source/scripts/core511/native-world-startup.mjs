import {DatabaseHost} from './database-host.mjs';
import {createNativeWorldStartup} from './generated/native-world-startup.mjs';
import {demand} from './contract.mjs';

// Run the unchanged V510 balance/seed warmup exactly once, before writer
// snapshots or owners. Refuse old/empty layouts instead of running migrations
// on CURRENT DB. A live HTTP call can only check this durable startup proof.
export class NativeWorldStartup {
 static async prepare(host,{clock=Date.now}={}){
  demand(host instanceof DatabaseHost&&host.stopped()&&!host.writer&&!host.nativeWorldStartup&&!host.database.core511WorldSeed,'native_startup_stopped_host');
  const sql=host.database.sqlite,world=sql.prepare('SELECT layout_version FROM world_state WHERE id=1').get();
  demand(world?.layout_version>=24&&sql.prepare('SELECT 1 FROM monsters LIMIT 1').get(),'native_startup_current_world');
  const self=new NativeWorldStartup(host);host.nativeWorldStartup=self;host.database.core511WorldSeed=self;
  try{
   await createNativeWorldStartup(host.database,{clock}).ensureWorldSeed();await host.database.durableAfterCommit();
   demand(host.stopped()&&!host.writer,'native_startup_owner_started');self.ready=true;return self;
  }catch(error){self.unbind();throw error;}
 }
 constructor(host){this.host=host;this.ready=false;this.closed=false;}
 async ensure(){this.host.assertOpen();demand(this.ready&&!this.closed&&this.host.nativeWorldStartup===this&&this.host.database.core511WorldSeed===this,'native_startup_not_ready');}
 unbind(){if(this.host.nativeWorldStartup===this)delete this.host.nativeWorldStartup;if(this.host.database.core511WorldSeed===this)delete this.host.database.core511WorldSeed;this.closed=true;this.ready=false;}
 close(){if(this.closed)return;demand(this.host.closed,'native_startup_host_still_open');this.unbind();}
}

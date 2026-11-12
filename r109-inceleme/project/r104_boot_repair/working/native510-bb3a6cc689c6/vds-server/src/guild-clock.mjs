import {attachPositionStore} from './position-store.mjs';
import {attachCombatStore} from './combat-store.mjs';
import {attachWorldLoop} from './world-loop.mjs';
import {DatabaseSync} from 'node:sqlite';
import {GUILD_WAR_TIMEOUT_SQL} from './guild-schema.mjs';
// War deadlines must settle even when every client disconnects. No network calls.
export function startGuildWarClock(file,{checkpoint,positions,combat,worldLoop}={}){
 const database=new DatabaseSync(file);database.exec('PRAGMA busy_timeout=1000;');
 attachPositionStore(database,positions);
 attachCombatStore(database,combat);
 attachWorldLoop(database,worldLoop);
 const releaseCheckpoint=checkpoint?.register(database);
 const active=database.prepare('SELECT 1 FROM guild_war_locks LIMIT 1'),finish=database.prepare(GUILD_WAR_TIMEOUT_SQL);
 const tick=()=>{try{if(!active.get())return;const now=Date.now();finish.run(now,now,now);}catch(error){console.error('Guild war clock retry',error.message);}};
 const timer=worldLoop?.enabled?null:setInterval(tick,1000),unregister=worldLoop?.enabled?worldLoop.register('world_guild_clock',1000,tick):()=>{};
 let stopped=false;const stop=()=>{if(stopped)return;stopped=true;clearInterval(timer);unregister();releaseCheckpoint?.();database.close();process.off('exit',stop);};
 timer?.unref();process.once('exit',stop);return stop;
}

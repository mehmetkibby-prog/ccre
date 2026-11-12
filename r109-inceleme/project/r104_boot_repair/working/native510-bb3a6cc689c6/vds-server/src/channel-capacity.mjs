import {channelProcessesEnabled} from './channel-protocol.mjs';
// Admission is authoritative: even direct heartbeat writes cannot bypass the
// configured limit or the absolute ceiling of 30 players per channel.
export function ensureChannelCapacitySchema(db,{processes=channelProcessesEnabled()}={}) {
 const capacity="COALESCE((SELECT MAX(1,MIN(30,CAST(channel_capacity AS INTEGER))) FROM game_settings WHERE id=1),15)";
 db.exec('SAVEPOINT channel_capacity_upgrade');
 try {
  db.exec('CREATE TABLE IF NOT EXISTS channel_capacity_modes(mode INTEGER PRIMARY KEY CHECK(mode IN(0,1)),capacity INTEGER NOT NULL CHECK(capacity BETWEEN 1 AND 30)); CREATE TABLE IF NOT EXISTS channel_capacity_current(id INTEGER PRIMARY KEY CHECK(id=1),mode INTEGER NOT NULL)');
  const mode=Number(processes),previous=db.prepare('SELECT mode FROM channel_capacity_current WHERE id=1').get(),current=db.prepare('SELECT channel_capacity AS capacity FROM game_settings WHERE id=1').get();
  if(previous&&previous.mode!==mode){
   db.prepare('INSERT INTO channel_capacity_modes VALUES(?,?) ON CONFLICT(mode) DO UPDATE SET capacity=excluded.capacity').run(previous.mode,Math.max(1,Math.min(30,Number(current?.capacity)||15)));
   const saved=db.prepare('SELECT capacity FROM channel_capacity_modes WHERE mode=?').get(mode)?.capacity??(mode?30:15);
   db.prepare('UPDATE game_settings SET channel_capacity=? WHERE id=1').run(saved);
  }else if(!previous&&mode){db.prepare('INSERT OR IGNORE INTO channel_capacity_modes VALUES(0,?)').run(Math.max(1,Math.min(30,Number(current?.capacity)||15)));db.exec('UPDATE game_settings SET channel_capacity=30 WHERE id=1');}
  db.prepare('INSERT INTO channel_capacity_current VALUES(1,?) ON CONFLICT(id) DO UPDATE SET mode=excluded.mode').run(mode);
  db.exec(`UPDATE game_settings SET channel_capacity=MAX(1,MIN(30,COALESCE(CAST(channel_capacity AS INTEGER),15))) WHERE id=1;
 DROP TRIGGER IF EXISTS channel_capacity_insert;
 DROP TRIGGER IF EXISTS channel_capacity_reentry;
 CREATE TRIGGER channel_capacity_insert
 BEFORE INSERT ON players
 WHEN NEW.last_seen >= unixepoch()-30
 AND (SELECT COUNT(*) FROM players WHERE channel=NEW.channel AND last_seen>=unixepoch()-30) >= ${capacity}
 BEGIN SELECT RAISE(ABORT, 'channel_full'); END;
 CREATE TRIGGER channel_capacity_reentry
 BEFORE UPDATE OF channel,last_seen ON players
 WHEN NEW.last_seen >= unixepoch()-30
 AND (OLD.channel != NEW.channel OR OLD.last_seen < unixepoch()-30)
 AND (SELECT COUNT(*) FROM players WHERE channel=NEW.channel AND id!=OLD.id AND last_seen>=unixepoch()-30) >= ${capacity}
 BEGIN SELECT RAISE(ABORT, 'channel_full'); END;`);db.exec('RELEASE channel_capacity_upgrade');}
 catch(error){db.exec('ROLLBACK TO channel_capacity_upgrade; RELEASE channel_capacity_upgrade');throw error;}
}

import {friendAction490} from './friends490.mjs';
// Private, one-way character contacts. No economy or gameplay authority changes.
export const FRIEND_LIMIT487 = 100;
export function ensureFriendsSchema487(db) {
  db.exec(`CREATE TABLE IF NOT EXISTS player_friends487 (
    owner_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    friend_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    created_at INTEGER NOT NULL,
    PRIMARY KEY(owner_id,friend_id), CHECK(owner_id<>friend_id)
  );
  CREATE INDEX IF NOT EXISTS player_friends487_target ON player_friends487(friend_id);`);
}
export const FRIEND_ROWS_SQL487 = `SELECT p.id,p.name,p.last_seen,p.is_gm,p.gm_invisible
 FROM player_friends487 f JOIN players p ON p.id=f.friend_id
 WHERE f.owner_id=? AND f.state490='accepted' ORDER BY f.created_at,p.id LIMIT 100`;
export function friendOnline487(row, nowSeconds) {
  return !!row && !(Number(row.is_gm)===1 && Number(row.gm_invisible)===1) && Number(row.last_seen)>=nowSeconds-30;
}
export function friendsView487(rows, nowSeconds) {
  return rows.slice(0,FRIEND_LIMIT487).map(row=>({id:row.id,name:row.name,online:friendOnline487(row,nowSeconds)}));
}
export async function readFriends487(database, playerId) {
  return (await database.prepare(FRIEND_ROWS_SQL487).bind(playerId).all()).results;
}
export const friendAction487=friendAction490;
export async function resolvePeer487(database, name, playerId) {
  if(typeof name!=='string')return null;
  const exact=name.trim();
  if(!exact||exact.length>18||/[<>\u0000-\u001f\u007f]/u.test(exact))return null;
  const peer=await database.prepare('SELECT id,name FROM players WHERE name=? AND id<>? LIMIT 1').bind(exact,playerId).first();
  return peer ? {id:peer.id,name:peer.name} : null;
}

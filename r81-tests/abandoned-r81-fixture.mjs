import {DatabaseSync} from 'node:sqlite';

export const NOW_MS = 2_000_000_000_000;
export const TARGET = Object.freeze({id:'ordinary-monster',spawnRound:17});
export const ELIGIBILITY_COLUMNS = Object.freeze(['id','hp','last_seen','movement_checked_at_ms','last_monster_hit_at','area','channel','arena_match_id','x','y']);

export function fixture({path=':memory:',extraColumns=0,payloadBytes=0}={}) {
 const db=new DatabaseSync(path);
 const extra=Array.from({length:extraColumns},(_,i)=>`,payload_${i} TEXT DEFAULT ''`).join('');
 db.exec(`
 CREATE TABLE players(id TEXT PRIMARY KEY,hp INTEGER,last_seen INTEGER,movement_checked_at_ms INTEGER,last_monster_hit_at INTEGER,area TEXT,channel INTEGER,arena_match_id TEXT,x REAL,y REAL${extra});
 CREATE TABLE monster_participants(monster_id TEXT,spawn_round INTEGER,player_id TEXT,PRIMARY KEY(monster_id,spawn_round,player_id));
 CREATE TABLE normal_reward_claims(monster_id TEXT,spawn_round INTEGER,player_id TEXT,PRIMARY KEY(monster_id,spawn_round,player_id));
 CREATE TABLE monster_xp_claims(monster_id TEXT,spawn_round INTEGER,player_id TEXT,PRIMARY KEY(monster_id,spawn_round,player_id));
 CREATE TABLE sinsi_reward_claims(monster_id TEXT,spawn_round INTEGER,player_id TEXT,PRIMARY KEY(monster_id,spawn_round,player_id));
 CREATE TABLE boss_reward_claims(boss_round INTEGER,player_id TEXT,PRIMARY KEY(boss_round,player_id));
 CREATE TABLE loadlab_boss_rounds_v1(boss_round INTEGER PRIMARY KEY,monster_id TEXT);
 CREATE TABLE party_members(player_id TEXT PRIMARY KEY,party_id TEXT);
 CREATE INDEX party_members_party ON party_members(party_id,player_id);
 CREATE TABLE monsters(id TEXT PRIMARY KEY,channel INTEGER,is_boss INTEGER,is_stone INTEGER);
 CREATE TABLE normal_defeats(monster_id TEXT,spawn_round INTEGER,defeated_at INTEGER,loot_source_key TEXT,PRIMARY KEY(monster_id,spawn_round));
 `);
 const defaults={hp:100,last_seen:Math.floor(NOW_MS/1000),movement_checked_at_ms:0,last_monster_hit_at:0,area:'forest',channel:1,arena_match_id:'',x:0,y:0};
 const addPlayer=(id,changes={})=>{
  const row={id,...defaults,...changes};
  db.prepare(`INSERT INTO players(${ELIGIBILITY_COLUMNS.join(',')}) VALUES(${ELIGIBILITY_COLUMNS.map(()=>'?').join(',')})`).run(...ELIGIBILITY_COLUMNS.map(k=>row[k]));
  if(extraColumns&&payloadBytes)db.prepare(`UPDATE players SET ${Array.from({length:extraColumns},(_,i)=>`payload_${i}=?`).join(',')} WHERE id=?`).run(...Array(extraColumns).fill('x'.repeat(payloadBytes)),id);
 };
 const participant=(id,target=TARGET)=>db.prepare('INSERT INTO monster_participants VALUES(?,?,?)').run(target.id,target.spawnRound,id);
 const party=(id,partyId='party-a')=>db.prepare('INSERT INTO party_members VALUES(?,?)').run(id,partyId);
 const claim=(kind,id,target=TARGET)=>{
  if(kind==='boss')return db.prepare('INSERT INTO boss_reward_claims VALUES(?,?)').run(target.spawnRound,id);
  const tables={normal:'normal_reward_claims',xp:'monster_xp_claims',sinsi:'sinsi_reward_claims'};
  if(!tables[kind])throw Error('invalid fixture claim');
  return db.prepare(`INSERT INTO ${tables[kind]} VALUES(?,?,?)`).run(target.id,target.spawnRound,id);
 };
 const defeat=(target=TARGET)=>{
  db.prepare('INSERT OR IGNORE INTO monsters VALUES(?,1,0,0)').run(target.id);
  db.prepare('INSERT INTO normal_defeats VALUES(?,?,?,?)').run(target.id,target.spawnRound,Math.floor(NOW_MS/1000)-100,'normal');
 };
 return {db,addPlayer,participant,party,claim,defeat};
}

export function pair(options={}) {
 const f=fixture(options);
 f.addPlayer('owner');f.addPlayer('ally');f.participant('owner');f.party('owner');f.party('ally');f.defeat();
 return f;
}

export function heavyFixture(options={}){
 const f=pair({extraColumns:100,payloadBytes:256,...options}),db=f.db;db.exec('BEGIN');
 try{
  for(let i=0;i<598;i++)f.addPlayer('p'+i);
  for(let i=0;i<15;i++)f.participant('p'+i);
  for(let i=0;i<18;i++)f.party('p'+i,i<3?'party-a':'group-'+Math.floor((i+2)/5));
  const participant=db.prepare('INSERT INTO monster_participants VALUES(?,?,?)');
  const normal=db.prepare('INSERT INTO normal_reward_claims VALUES(?,?,?)');
  const xp=db.prepare('INSERT INTO monster_xp_claims VALUES(?,?,?)');
  const sinsi=db.prepare('INSERT INTO sinsi_reward_claims VALUES(?,?,?)');
  for(let i=0;i<30_000;i++){
   const values=['history-'+i%100,Math.floor(i/100),'p'+i%598];participant.run(...values);
   if(i%2===0)normal.run(...values);if(i%3===0)xp.run(...values);if(i%5===0)sinsi.run(...values);
  }
  for(let i=0;i<3;i++)f.claim('xp','p'+i);
  const inventory=JSON.stringify({items:Array.from({length:100},(_,i)=>({id:'item-'+i,name:'stored equipment',upgrade:i%10,metadata:'x'.repeat(32)}))});
  db.prepare('UPDATE players SET payload_0=?,payload_1=?,payload_2=?').run(inventory,inventory,inventory);
  db.exec('COMMIT');return f;
 }catch(error){db.exec('ROLLBACK');db.close();throw error;}
}

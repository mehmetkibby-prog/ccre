import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
import test from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import {nativeHttpHost} from '../../r109_latency_completion/working/core511-source/scripts/core511/tests/native-http-host-fixture.mjs';

test('offline space reclamation accepts a native game database with its full schema',async t=>{
 const game=await nativeHttpHost(t);const temp=fs.mkdtempSync(path.join(os.tmpdir(),'r127-disk-schema-'));
 t.after(()=>fs.rmSync(temp,{recursive:true,force:true}));
 const file=path.join(temp,'game.sqlite');
 game.f.sql.exec('PRAGMA busy_timeout=5000');game.f.sql.prepare('VACUUM INTO ?').run(file);
 const python=[
  'import os,sqlite3,sys',
  'from contextlib import closing',
  'from pathlib import Path',
  'from disk_space import reclaim',
  'p=Path(sys.argv[1]); ident=p.stat()',
  'with closing(sqlite3.connect(p)) as c:',
  ' c.executescript("PRAGMA journal_mode=WAL;CREATE TABLE r127_fixture_pad(id INTEGER PRIMARY KEY,data BLOB)")',
  ' c.executemany("INSERT INTO r127_fixture_pad(data) VALUES(randomblob(8192))",[()]*720);c.commit()',
  ' c.execute("DELETE FROM r127_fixture_pad");c.commit()',
  ' players=list(c.execute("SELECT id,name,hp,gems FROM players ORDER BY id"))',
  'freed=reclaim(p,(ident.st_dev,ident.st_ino));assert freed>4*1024**2,freed',
  'with closing(sqlite3.connect(p)) as c:',
  ' assert list(c.execute("SELECT id,name,hp,gems FROM players ORDER BY id"))==players',
  ' assert c.execute("PRAGMA integrity_check").fetchone()==("ok",)',
  'print("native schema and "+str(len(players))+" synthetic accounts verified, reclaimed="+str(freed))',
 ].join('\n');
 const result=spawnSync('python3',['-c',python,file],{encoding:'utf8',cwd:path.join(import.meta.dirname,'../deployment/modules')});
 assert.equal(result.status,0,result.stderr);t.diagnostic(result.stdout.trim());
});

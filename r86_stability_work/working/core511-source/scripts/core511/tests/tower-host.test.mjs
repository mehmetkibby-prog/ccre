import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeHttpHost} from './native-http-host-fixture.mjs';
import {TOWER_DEFAULTS} from '../tower-config.mjs';

test('tower schema and admin save integrate with actual writer, four channel owners and world configuration barrier',{timeout:30000},async t=>{
 const s=await nativeHttpHost(t);s.core.start();await s.world.stopJobs();
 assert.equal(s.bindings.towerReady,true);
 const adapter=s.host.database.core511TowerAdmin;assert.equal(adapter.get().revision,1);
 const config=structuredClone(TOWER_DEFAULTS);config.floors[0].name='Yazıcı doğrulama katı';
 const identityBefore=s.host.database.sqlite.prepare('SELECT COUNT(*) n FROM players').get().n;
 const saved=await adapter.save(config,1);assert.equal(saved.revision,2);assert.equal(adapter.get().config.floors[0].name,'Yazıcı doğrulama katı');
 assert.equal(s.host.database.sqlite.prepare('SELECT revision FROM kadim_tower_settings').get().revision,2);
 assert.equal(s.host.database.sqlite.prepare('SELECT COUNT(*) n FROM players').get().n,identityBefore);
 assert.equal(s.core.globalWorld.held,null);assert.equal(s.core.globalWorld.recovery,null);assert.equal(s.faults.length,0);
});

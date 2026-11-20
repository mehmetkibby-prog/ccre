"""Exercise the pinned projection oracle with the released drop lifetime and unordered entity IDs."""
import importlib.util
import os
import shutil
import subprocess
import tempfile
from pathlib import Path

root=Path(__file__).resolve().parents[1]
core=root.parent/'r109_latency_completion/working/core511-source/scripts/core511'
runner_path=root.parents[1]/'scripts/run.py'
spec=importlib.util.spec_from_file_location('release_runner',runner_path)
runner=importlib.util.module_from_spec(spec);spec.loader.exec_module(runner)
env,policy=runner.environment()
args=policy['nodeArgumentsWhenEnabled'] if env.get(policy['flag'])=='1' else []
node=os.environ.get('REVIEW_NODE') or shutil.which('node')
legacy=(core/'tests/world-projection.test.mjs').read_text()
# The older native oracle uses inclusive expiry. R127's retained 30s policy
# expires the drop at the start of its last second. Delta players are keyed by
# ID, so a returning visible player may be appended in a different order.
anchor="assert.deepEqual(clean(actual),clean(expected),id);"
assert legacy.count(anchor)==1
adapted=legacy.replace(anchor,"""if(process.env.CORE511_GROUND_LOOT_30S!=='0')expected.drops=expected.drops.filter(d=>d.expires_at>Math.floor(time/1000));
 const canonical=v=>({...clean(v),players:clean(v).players.sort((a,b)=>a.id.localeCompare(b.id))});
 assert.deepEqual(canonical(actual),canonical(expected),id);""")
adapted+="""
test('an already subscribed bazaar player receives the new listing as a world delta without rejoining',t=>{
 const f=fixture(t,{count:2,area:'bazaar'});
 for(const id of ['player-0','player-1'])f.seed(id,{...f.dataFor(id),shops:[]});
 f.core.setMarket({revision:1,shops:[]});f.tick();
 const stall={id:'bazaar-stall',channel:1,owner_id:'player-0',owner_name:'Player 0',name:'Taşlar',active:1,created_at:99,x:200,y:350,stock_count502:0};
 f.core.setMarket({revision:2,shops:[stall]});f.tick();
 assert.equal(f.received.get('player-1').shops.length,0);
 f.core.setMarket({revision:3,shops:[{...stall,stock_count502:1}]});const tick=f.tick();
 assert.equal(tick.get('player-1').world.type,'world_delta');
 assert.deepEqual(f.received.get('player-1').shops,[{...stall,stock_count502:1}]);
 f.core.setMarket({revision:4,shops:[{...stall,active:0}]});f.tick();
 assert.equal(f.received.get('player-1').shops.length,0);
});
"""
with tempfile.TemporaryDirectory(prefix='r127-projection-') as tmp:
    tree=Path(tmp)/'core';tests=tree/'tests';tests.mkdir(parents=True)
    for path in core.iterdir():
        if path.name!='tests':(tree/path.name).symlink_to(path)
    for path in (core/'tests').iterdir():
        if path.name!='world-projection.test.mjs':(tests/path.name).symlink_to(path)
    out=tests/'world-projection.test.mjs';out.write_text(adapted)
    subprocess.run([node,*args,'--test',str(out)],env=env,check=True)

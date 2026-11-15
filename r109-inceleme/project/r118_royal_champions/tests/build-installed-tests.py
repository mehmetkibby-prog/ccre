"""Retain the entry/handoff checks, with explicit R118 synthetic DB migration."""
from pathlib import Path

HERE=Path(__file__).resolve().parent
SOURCE=HERE.parents[1]/'r109_latency_completion/tests'
for name in ('relocated-entry.test.mjs','ws-handoff-runtime.test.mjs'):
    text=(SOURCE/name).read_text()
    marker="const {NativeWorldStartup}=await import(core+'/native-world-startup.mjs');"
    assert text.count(marker)==1
    text=text.replace(marker,marker+"\nconst {prepareRoyalFixtureR118}=await import(core+'/tests/royal-schema-fixture-r118.mjs');")
    marker='await NativeWorldStartup.prepare(host);'
    assert text.count(marker)==1
    text=text.replace(marker,marker+'prepareRoyalFixtureR118(host.database.sqlite);await host.database.durableAfterCommit();')
    if name=='relocated-entry.test.mjs':
        assert 'n<15000' in text
        text=text.replace("database.sqlite.exec('BEGIN');for(let n=0;n<15000;n++)", "const startupMonsters=Number(process.env.R118_STARTUP_MONSTERS??15000);assert(Number.isSafeInteger(startupMonsters)&&startupMonsters>=15000&&startupMonsters<=30000);database.sqlite.exec('BEGIN');for(let n=0;n<startupMonsters;n++)")
        marker="t.after(async()=>{for(const c of children)await stop(c);"
        assert text.count(marker)==1
        text=text.replace(marker,"t.after(async()=>{for(let i=0;i<children.length;i++)fs.writeFileSync(evidenceDir+'/'+label+'-r'+(i+1)+'.log',children[i].output);for(const c of children)await stop(c);")
        marker="if(realm.id==='r1')assert(child.output.includes('core511_boot_read'),'large boot limit was not exercised');"
        assert text.count(marker)==1
        text=text.replace(marker,marker+"\n  assert(!child.output.includes('\\\"event\\\":\\\"core511_fault\\\"'),child.output);assert(!child.output.includes('\\\"action\\\":\\\"channel_recovery_request\\\"'),child.output);")
    text="if(process.env.R118_CHILD_STDERR_DIAGNOSTIC==='1')process.env.NODE_OPTIONS=(process.env.NODE_OPTIONS??'')+' --require='+new URL('./child-stderr-diagnostic.cjs',import.meta.url).pathname;\n"+text
    text='// R118 explicit migration of a fresh synthetic realm before actual installed runtime boot.\n'+text
    (HERE/name).write_text(text)

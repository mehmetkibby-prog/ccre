"""Stage R85 from exact R84 pins. Creates no releasable archive."""
import hashlib
import json
import re
from pathlib import Path
from installer_extensions import ingress_stage

ROOT = Path(__file__).resolve().parent
HANDOFF = ROOT / 'handoff'
PACKAGE = ROOT / 'r85-package'
CORE = 'core511-source/scripts/core511/'
HTTP = 'http-runtime/dist-vds/server/index.js'
BASE_CORE = 'a0e0bcdfd87717a3d5129a0a30d29bda5a4f85639a2b68773af556f19bda6365'
ARCHIVE_SHA = '87a244e0960f7556da117a28055ae0ade62a761351351769779cd03a0969ffca'
MODULES = ['installer.py','storage.py','central.mjs','r63_support.py','client_stage.py','retention.py','runtime_stage.py','inplace_stage.py','ingress_stage.py']
# Every addition to this list requires an explicit production ownership/review.
ALLOWED = {
    'permanent-coordinator.mjs', 'transfer-freeze-group.mjs', 'actor-isolation.mjs',
    'coordinator.mjs', 'resident-control.mjs', 'channel-runtime.mjs',
    'reliable-stream.mjs', 'shared-combat-bridge.mjs', 'freeze-outcomes-r85.mjs',
    'freeze-failure-r85.mjs', 'shared-combat-channel.mjs',
    'reward-actor-scope-r85.mjs', 'scoped-reward-maintenance-r79.mjs',
    'player-write-scope.mjs', 'actor-section-reuse-r52.mjs',
    'actor-progress-refresh-r85.mjs',
    'collect-light.mjs', 'collect-materials-r85.mjs',
    'game-services.mjs', 'reward-worker-runtime-r533.mjs', 'reward-rank-refresh-r85.mjs',
    'nonlethal-triggers-r56.mjs',
    'ownership.mjs', 'shared-claim-rejection-r85.mjs', 'command-failure-scope.mjs',
    'attack-loop.mjs', 'death-batch-single-r57.mjs', 'death-batch-writer-r57.mjs',
    'independent-death-batch-r85.mjs',
    'action-loop.mjs', 'claim-actor-join-r56.mjs', 'collect-join-r85.mjs', 'collect-encounter-r85.mjs',
    'writer-lane-r533.mjs',
    'adventure-channel.mjs', 'loot-profile-cache-r61.mjs', 'generated/loot-profile-cache-r61-proof.json',
    'action-writer.mjs', 'respawn-notification-r85.mjs', 'notification-audience.mjs',
    'native-http-bindings.mjs', 'generated/native-client-proof.json',
    'generated/native-http-composition-proof.json',
    'generated/client/game-client-core511-r85-b25e12cf61072ebe.js',
}

def sha(data): return hashlib.sha256(data).hexdigest()
def read(path): return json.loads(path.read_text())
def write(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(data)
def encoded(data): return (json.dumps(data, ensure_ascii=False, indent=2)+'\n').encode()
def identity(rows):
    rows = [{'path':r['path'],'bytes':r['bytes'],'sha256':r['sha256']} for r in sorted(rows, key=lambda r:tuple(r['path'].split('/')))]
    return sha(json.dumps({'kind':'core511-source-candidate-v1','baselineManifestSha256':'bb3a6cc689c695d97f127a2eefb9ad141b0e655eb39bbebeea5f05704074ad3b','files':rows},ensure_ascii=False,separators=(',',':')).encode())

def source_rows():
    import zipfile
    archive=HANDOFF/'CORE511_R84_TOPLU.zip'
    assert sha(archive.read_bytes())==ARCHIVE_SHA, 'R84 archive identity changed'
    with zipfile.ZipFile(archive) as z:
        old=json.loads(z.read('update.json'))
        rows={r['path']:dict(r) for r in old['baseCoreRows']}
        assert identity(rows.values())==old['baseCoreSHA256']
        for name,meta in old['files'].items():
            data=z.read('payload/'+name)
            assert len(data)==meta['bytes'] and sha(data)==meta['after']
            if name.startswith(CORE):
                short=name[len(CORE):]
                assert rows.get(short,{}).get('sha256')==meta['before']
                rows[short]={'path':short,'bytes':len(data),'sha256':sha(data)}
    assert len(rows)==1167 and identity(rows.values())==BASE_CORE
    return old,rows

def transform_versions(text):
    return re.sub(r'R8[34]|r8[34]', lambda m:{'R83':'R84','R84':'R85','r83':'r84','r84':'r85'}[m[0]], text)

def stage():
    previous,rows=source_rows()
    work=ROOT/'working'
    actual={p.relative_to(work/CORE).as_posix():p for p in (work/CORE).rglob('*') if p.is_file()}
    assert set(rows)<=set(actual),'A pinned R84 core file was removed'
    changed=[]
    for name,path in actual.items():
        assert not path.is_symlink()
        data=path.read_bytes(); base=rows.get(name)
        if base and sha(data)==base['sha256'] and len(data)==base['bytes']:continue
        assert name in ALLOWED,'Unreviewed production scope: '+name
        changed.append(name)
    assert changed and 'native-http-bindings.mjs' in changed
    # Existing files first makes rollback crash scenarios independent of new helpers.
    changed=sorted(changed,key=lambda n:(n not in rows,n))
    files={}
    for short in changed:
        data=actual[short].read_bytes();base=rows.get(short)
        files[CORE+short]={'before':base['sha256'] if base else None,'after':sha(data),'bytes':len(data)}
    client=read(ROOT/'evidence/client-integration.json')
    data=(work/HTTP).read_bytes()
    assert sha(data)==client['generatedSha256']
    files[HTTP]={'before':client['sourceSha256'],'after':sha(data),'bytes':len(data)}
    # This prerequisite is archived, not asserted to be the current live file.
    # The shipped installer independently checks the actual file and manifest.
    ingress_before=(HANDOFF/'r85-investigation/source-recovery/archived-prerequisites'/ingress_stage.PATH).read_bytes()
    ingress_after=(work/ingress_stage.PATH).read_bytes()
    assert ingress_after==ingress_stage.canonical_payload(ingress_before),'Ingress scope is not the reviewed one-property delta'
    files[ingress_stage.PATH]=ingress_stage.metadata()
    plan={k:previous[k] for k in ('protocol','databaseChanges','databaseSchemaChanges','databaseScope','accountsChanges','nativeBaseline','operationsCanonicalSHA256','runtime')}
    plan.update(version='R85_GAMEPLAY',sourceVersion='R84_GAMEPLAY',clientChanges=True,
        client={k:client[k] for k in ('oldNamespace','namespace','oldName','name')},
        httpEntrySHA256=client['sourceSha256'],baseCoreSHA256=BASE_CORE,
        baseCoreRows=sorted(rows.values(),key=lambda r:tuple(r['path'].split('/'))),files=files)
    plan['client']['generatedNames']=[client['name']]
    new=frozenset(n for n,m in files.items() if m['before'] is None)
    text=transform_versions((HANDOFF/'r84-package/modules/installer.py').read_text())
    replacements={
        'CLIENT_OLD_NAMESPACE':repr(client['oldNamespace']), 'CLIENT_NAMESPACE':repr(client['namespace']),
        'CLIENT_OLD_NAME':repr(client['oldName']), 'CLIENT_NAME':repr(client['name']),
        'SOURCE_CORE_SHA256':repr(BASE_CORE), 'R84_HTTP_SHA256':repr(client['sourceSha256']),
    }
    for key,value in replacements.items():
        text,n=re.subn(r'^'+key+r'=.*$',key+'='+value,text,flags=re.M);assert n==1,key
    start=text.index('PRODUCTION_PATHS=');end=text.index("NATIVE_TIMING=",start)
    text=text[:start]+'PRODUCTION_PATHS='+repr(tuple(files))+'\nNEW_PRODUCTION_PATHS=frozenset('+repr(sorted(new))+')\n'+text[end:]
    injections={
        'import inplace_stage as inplace\n':'import inplace_stage as inplace\nimport ingress_stage as ingress\n',
        '\ndef initial_core(live,plan):':' ingress.validate_plan(plan)\n\ndef initial_core(live,plan):',
        " require(manifest.get('baselineSha256')==plan['nativeBaseline'],'Oyun tabanı farklı')":
            " require(manifest.get('baselineSha256')==plan['nativeBaseline'],'Oyun tabanı farklı')\n ingress.validate_installed(live.root,manifest,updated=installed==VERSION)",
        " require(len(by_name)==len(manifest['files']),'Tekrarlanan manifest dosyası')":
            " require(len(by_name)==len(manifest['files']),'Tekrarlanan manifest dosyası')\n ingress.validate_update(live.root,plan,updates,original_manifest,source_reader=source_reader)",
    }
    for old,new_text in injections.items():
        assert text.count(old)==1,'Installer ingress integration anchor changed: '+old
        text=text.replace(old,new_text)
    write(PACKAGE/'modules/installer.py',text.encode())
    for name in MODULES:
        if name=='installer.py':continue
        data=((ROOT/'installer_extensions'/name) if name=='ingress_stage.py' else (HANDOFF/'r84-package/modules'/name)).read_bytes()
        if name in ('runtime_stage.py','inplace_stage.py'):data=transform_versions(data.decode()).encode()
        write(PACKAGE/'modules'/name,data)
    bootstrap=transform_versions((HANDOFF/'r84-package/__main__.py').read_text())
    bootstrap,count=re.subn(r'^  expected=.*$', '  expected=set('+repr(tuple(MODULES))+')', bootstrap, flags=re.M)
    assert count==1,'Bootstrap module allowlist anchor changed'
    write(PACKAGE/'__main__.py',bootstrap.encode())
    # Refuse stale payload paths; never silently delete artifacts from another scope.
    payload=PACKAGE/'payload'
    if payload.exists():
        existing={p.relative_to(payload).as_posix() for p in payload.rglob('*') if p.is_file()}
        assert existing<=set(files),'Stale payload needs explicit review'
    for name in files:write(payload/name,(work/name).read_bytes())
    write(PACKAGE/'update.json',encoded(plan))
    write(PACKAGE/'client-plan.json',encoded(plan['client']))
    write(PACKAGE/'RUNTIME.json',(HANDOFF/'r84-package/RUNTIME.json').read_bytes())
    target={**rows}
    for n,m in files.items():
        if n.startswith(CORE):target[n[len(CORE):]]={'path':n[len(CORE):],'bytes':m['bytes'],'sha256':m['after']}
    result={'sourceCoreSHA256':BASE_CORE,'targetCoreSHA256':identity(target.values()),'files':files,'productionFiles':len(files),'newFiles':sorted(new),'archiveProduced':False}
    write(ROOT/'evidence/package-plan.json',encoded(result))
    print(json.dumps({k:v for k,v in result.items() if k!='files'},indent=2))

if __name__=='__main__':
    if not __debug__:raise RuntimeError('Package verification requires Python assertions')
    stage()

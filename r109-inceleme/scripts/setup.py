#!/usr/bin/env python3
"""Prepare disposable dependency links and browser aliases inside this checkout."""
from pathlib import Path
import hashlib, json, os
ROOT=Path(__file__).resolve().parents[1];P=ROOT/'project'
if not (ROOT/'node_modules/ws/package.json').is_file():raise SystemExit('Run npm ci first.')
adapter=ROOT/'node_modules/vinext/dist/server/prod-server.js'
if not adapter.is_file() or hashlib.sha256(adapter.read_bytes()).hexdigest()!='6cd31436a414b4bbb18bf5e5d1cd5c10b674748ffb5b19fbcbfb92b450e1421c':
    raise SystemExit('Pinned Vinext production adapter missing or different; run npm ci.')
for name in ['r109_latency_completion','r105_performance_review','r106_captcha_worker','r104_boot_repair','r61_audio_work']:
    native=P/name/'working/native510-bb3a6cc689c6'
    target=native/'node_modules'
    if not target.exists():target.symlink_to(os.path.relpath(ROOT/'node_modules',native),target_is_directory=True)
    for kind in ['http-runtime','accounts-runtime']:
        runtime=native.parent/kind
        if not runtime.is_dir():continue
        (runtime/'package.json').write_text('{"type":"module"}\n')
        for part in ['node_modules','lib','vds-server']:
            link=runtime/part
            if not link.exists():link.symlink_to(os.path.relpath(native/part,runtime),target_is_directory=True)
        renderer=runtime/'dist-vds/server/__vite_rsc_assets_manifest.js'
        if not renderer.exists():renderer.write_text('export default {serverResources:{},clientReferenceDeps:{}};\n')
aliases=json.loads((P/'qa40_player_work/asset-aliases.relative.json').read_text())
for row in aliases.values():row['file']=str(P/row['file'])
(P/'qa40_player_work/asset-aliases.json').write_text(json.dumps(aliases,indent=2)+'\n')
root=P/'r109_latency_completion'
record=json.loads((root/'evidence/package.json').read_text())
record['file']=str(root/'delivery/r109-gecikme.zip')
(root/'evidence/package.json').write_text(json.dumps(record,indent=2)+'\n')
print('Local dependencies and synthetic browser fixtures ready. No database or server accessed.')

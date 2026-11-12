"""Bind R102 to the exact installed R101 source, including its historical C export."""
import hashlib,re
from pathlib import Path
import r63_support as old
from inplace_stage import checked_path
from storage import read,require,digest

CORE='core511-source/scripts/core511/'
OPS='core511-source/scripts/delivery511/install-operations.mjs'
EXTRA='benchmark/no-network.c'
CANDIDATE=re.compile(r"export const CANDIDATE='([0-9a-f]{64})';")
sha=lambda data:hashlib.sha256(data).hexdigest()

def source_rows(source):
 rows={row['path']:dict(row) for row in source['coreRows']}
 require(len(rows)==len(source['coreRows']) and old.identity_from_rows(rows.values())==source['core'],'Paket kaynak listesi kimliği farklı')
 require(EXTRA not in rows,'Eski tanılama kaynağı paket tabanında olamaz')
 return rows

def target_rows(rows,plan):
 result={name:dict(row) for name,row in rows.items()}
 for name,meta in plan['files'].items():
  if name.startswith(CORE) and Path(name).suffix in ('.mjs','.js','.json','.c'):
   short=name[len(CORE):];before=rows.get(short)
   require((before['sha256'] if before else None) in meta['before'],'Delta kaynak listesiyle eşleşmiyor: '+name)
   result[short]={'path':short,'bytes':meta['bytes'],'sha256':meta['after']}
 return result

def resolve(live,plan):
 version=live.state.get('r64Deployment',{}).get('version')
 require(version in plan['sources'],'Doğrulanmış R105_PERF1 veya R106_CAPTCHA1 sürümü kurulu olmalı')
 rows=source_rows(plan['sources'][version]);target=target_rows(rows,plan)
 require(old.identity_from_rows(target.values())==plan['targetCore'],'Paket hedef kaynak listesi farklı')
 manifest=read(checked_path(live.root,'release-manifest.json'))
 require(manifest.get('baselineSha256')==plan['nativeBaseline'],'Kurulu oyun tabanı farklı')
 files={row['path']:row for row in manifest['files']}
 require(len(files)==len(manifest['files']),'Tekrarlanan sürüm dosyası')
 extra_file=checked_path(live.root,CORE+EXTRA);extra=files.get(CORE+EXTRA)
 if extra:
  require(extra_file.is_file() and extra_file.stat().st_size==extra['bytes'] and digest(extra_file)==extra['sha256'],'Eski tanılama kaynağı manifestle eşleşmiyor')
  inherited={'path':EXTRA,'bytes':extra['bytes'],'sha256':extra['sha256']}
  rows[EXTRA]=dict(inherited);target[EXTRA]=dict(inherited)
 else:
  require(not extra_file.exists(),'Manifest dışı tanılama kaynağı bulundu')
  inherited=None
 expected=old.identity_from_rows(rows.values());actual=old.core_identity(live.root/CORE)
 require(actual==expected,'Kurulu çekirdek eşleşmedi: gerçek='+actual+' beklenen='+expected)
 require(live.state.get('candidate')==expected and manifest.get('runtimeSha256')==expected,'Kurulu durum ve sürüm manifest kimlikleri eşleşmiyor')
 code=checked_path(live.root,OPS).read_bytes();code_text=code.decode();matches=list(CANDIDATE.finditer(code_text))
 require(len(matches)==1 and matches[0][1]==expected,'Kurucu kaynak kimliği farklı')
 canonical=code_text.replace(matches[0][0],"export const CANDIDATE='R66_BASE_CORE';")
 require(sha(canonical.encode())==plan['operationsCanonicalSHA256'],'Kurucu kaynak dosyası farklı')
 row=files.get(OPS)
 require(row is not None and row['bytes']==len(code) and row['sha256']==sha(code),'Kurucu dosyası manifestle eşleşmiyor')
 target_core=old.identity_from_rows(target.values())
 updated=CANDIDATE.sub("export const CANDIDATE='"+target_core+"';",code_text,count=1).encode()
 return {'version':version,'sourceCore':expected,'targetCore':target_core,'inheritedSource':inherited,'operationsBefore':sha(code),'operationsAfter':sha(updated)}

def operations_update(root,binding):
 code=checked_path(root,OPS).read_bytes()
 require(sha(code)==binding['operationsBefore'],'Kurucu dosyası ön kontrolden sonra değişti')
 updated=CANDIDATE.sub("export const CANDIDATE='"+binding['targetCore']+"';",code.decode(),count=1).encode()
 require(sha(updated)==binding['operationsAfter'],'Yeni kurucu kimliği farklı')
 return updated

def verify_target(root,binding):
 expected=binding['targetCore']
 require(old.core_identity(root/CORE)==expected,'Kurtarma sırasında oyun kaynak kimliği değişmiş')
 require(read(checked_path(root,'release-manifest.json')).get('runtimeSha256')==expected,'Kurtarma sürüm manifest kimliği değişmiş')
 require(digest(checked_path(root,OPS))==binding['operationsAfter'],'Kurtarma kurucu kimliği değişmiş')

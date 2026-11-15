"""Check changed runtime imports against the final release before stopping it.

Only imports in deployed core modules are examined. Generated browser chunks,
tests and generator tools are not server entry points. This check does not
execute JavaScript or open a database.
"""
import posixpath,re
from pathlib import Path
from storage import require,read,digest
from inplace_stage import checked_path

IMPORT=re.compile(r'''(?:\b(?:import|export)\s+(?:[^;\n]*?\s+from\s*)?|\bimport\s*\(\s*)["']([^"']+)["']''')
CORE='core511-source/scripts/core511/'
NATIVE='native510-bb3a6cc689c6/vds-server/src/'
WORKER_URL=re.compile(r'''new\s+URL\(\s*["']([^"']+)["']\s*,\s*import\.meta\.url\s*\)''')

def validate(root,plan,archive):
 checked=0;manifest={r['path']:r for r in read(root/'release-manifest.json')['files']}
 for name in plan['files']:
  if not name.startswith((CORE,NATIVE)) or not name.endswith('.mjs') or '/tests/' in name or Path(name).name.startswith(('extract-','patch-')):continue
  text=archive.read('payload/'+name).decode()
  # new URL('./generated/client/', import.meta.url) is a resource directory,
  # unlike an import or a worker module. Check that directory without treating
  # it as an executable file; actual imports still require a regular file.
  specs=[(s,False) for s in IMPORT.findall(text)]+[(s,s.endswith('/')) for s in WORKER_URL.findall(text)]
  for specifier,directory in specs:
   if not specifier.startswith('.'):continue
   target=posixpath.normpath(posixpath.join(posixpath.dirname(name),specifier))
   require(not target.startswith('../') and not target.startswith('/'),'Sunucu modülü sürüm dışına çıkıyor: '+name+' → '+specifier)
   if directory:
    folder=checked_path(root,target)
    require(folder.is_dir() and not folder.is_symlink(),'Sunucu kaynak dizini bulunamadı: '+target)
    checked+=1
    continue
   require(target in plan['files'] or (root/target).is_file(),'Sunucu modülü bulunamadı: '+name+' → '+specifier)
   if target.startswith(NATIVE) and target not in plan['files']:
    file=checked_path(root,target);row=manifest.get(target)
    require(row is not None and file.stat().st_size==row['bytes'] and digest(file)==row['sha256'],'Native modül manifestle eşleşmiyor: '+target)
   checked+=1
 return checked

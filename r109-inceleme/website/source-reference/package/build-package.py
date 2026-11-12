from pathlib import Path
import hashlib,json,zipfile
ROOT=Path(__file__).resolve().parent.parent
manifest=json.loads((ROOT/'BUILD.json').read_text())
output=ROOT/'CORE_OF_LIFE_SITE_V2.zip'
main='''import os,sys\nfrom site_install import main\ntry:\n    main(archive=os.path.abspath(sys.argv[0]))\nexcept Exception as error:\n    print("STOP: "+str(error),file=sys.stderr)\n    sys.exit(1)\n'''
with zipfile.ZipFile(output,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=6) as z:
    z.writestr('__main__.py',main)
    z.write(ROOT/'package/site_install.py','site_install.py')
    z.write(ROOT/'backend/launch-config.mjs','launch-config.mjs')
    z.write(ROOT/'BUILD.json','BUILD.json')
    for name in manifest['files']:z.write(ROOT/'dist'/name,'site/'+name)
    for file in ['KURULUM.md','TASARIM_NOTLARI.md']:
        if (ROOT/file).exists():z.write(ROOT/file,file)
    for file in ['cinzel-LICENSE.txt','manrope-LICENSE.txt']:z.write(ROOT/'reference'/file,'licenses/'+file)
    for file in ['browser.json','installer.json','initial-load.json','tested-package-members.json','launch-config.json','video.json']:
        if (ROOT/'evidence'/file).exists():z.write(ROOT/'evidence'/file,'checks/'+file)
digest=hashlib.sha256(output.read_bytes()).hexdigest()
(ROOT/'SHA256.txt').write_text(f'{digest}  {output.name}\n')
print(json.dumps({'file':str(output),'bytes':output.stat().st_size,'sha256':digest,'release':manifest['release']}))

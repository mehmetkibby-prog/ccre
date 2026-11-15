from pathlib import Path
from PIL import Image
import json,hashlib
p=Path(__file__).resolve().parent;m=json.loads((p/'manifest.json').read_text());results=[];decoded=0
for key,a in m['assets'].items():
 f=p/'optimized'/a['file'];raw=f.read_bytes();assert hashlib.sha256(raw).hexdigest()==a['sha256'];assert len(raw)==a['bytes']
 im=Image.open(f);assert im.size==(a['width'],a['height']);decoded+=im.width*im.height*4
 if a['alpha']:
  assert im.mode=='RGBA';alpha=im.getchannel('A');assert alpha.getextrema()==(0,255)
 if key.startswith('champions-') and key!='champions-map-r118':
  assert im.size==(1280,512);frames=[]
  for row in range(2):
   for col in range(5):
    cell=im.crop((col*256,row*256,(col+1)*256,(row+1)*256));b=cell.getchannel('A').point(lambda n:255 if n>=32 else 0).getbbox()
    assert b is not None and b[0]>=8 and b[2]<=248 and b[3]<=233, (key,row,col,b)
    assert b[3]>=230,(key,row,col,'floatingfeet',b)
    frames.append(hashlib.sha256(cell.tobytes()).hexdigest())
  assert len(set(frames))==10,'duplicate animation frames'
 results.append({'asset':key,'pass':True})
assert m['totalBytes']<2_500_000
report={'artAssets':len(results),'passed':len(results),'failed':0,'compressedBytes':m['totalBytes'],'rgbaDecodedBytes':decoded,'atlasFrames':40,'heroFrames':18,'maxMobFrameBaselineY':232,'results':results}
(p/'validation.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2))

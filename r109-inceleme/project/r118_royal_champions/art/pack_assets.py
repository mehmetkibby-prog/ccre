"""Deterministic sprite packing of original imagegen art; no runtime rasterization.
Artwork itself is original generated work. This build step only packs cells,
normalizes transparent margins/foot anchors, and encodes game-ready WebP.
"""
from pathlib import Path
from PIL import Image, ImageOps, ImageDraw
import hashlib,json,shutil
import numpy as np
from scipy import ndimage
ROOT=Path(__file__).resolve().parent
OUT=ROOT/'optimized';OUT.mkdir(exist_ok=True)
SRC=ROOT/'sources';SRC.mkdir(exist_ok=True)
FILES={
 'icons':'exec-850c417e-b448-4576-8825-625d526ad2d7.png',
 'hero':'exec-1e26d51b-e6d1-453b-829c-ddacc001fec3.png',
 'map':'exec-bc1ad67c-2705-423d-ad21-0a025b2d4d69.png',
 'ivory_guard':'exec-29907704-bcdb-47f6-af4c-1bfd2d4eba70.png',
 'golden_lion':'exec-3f14be51-1500-47e5-b5e0-3473c275acf9.png',
 'crescent_hunter':'exec-ed245e71-cacf-49e5-a192-c655af3761c6.png',
 'royal_colossus':'exec-97c27e3e-9628-42f7-a3bd-b490799a64b2.png',
 'weapons':'exec-dedb104d-2646-4b70-a0dd-fdcf29bcd1c0.png'
}
for key,name in FILES.items():
 p=SRC/(key+'.png')
 if not p.exists():shutil.copyfile(Path('/workspace/generated_images')/name,p)

def clean(im):
 im=im.convert('RGBA');a=im.getchannel('A');im.putalpha(a.point(lambda n:0 if n<8 else 255 if n>240 else n));return im

def cells(key,cols,rows):
 im=clean(Image.open(SRC/(key+'.png')));w,h=im.size
 return [im.crop((round(c*w/cols),round(r*h/rows),round((c+1)*w/cols),round((r+1)*h/rows))) for r in range(rows) for c in range(cols)]

def sprite_parts(key):
 # Generated atlases place complete sprites near grid centers but a long blade
 # may cross a nominal cell boundary. Extract whole disconnected characters
 # before packing; never crop a sword/limb at a grid divider.
 im=clean(Image.open(SRC/(key+'.png')));pixels=np.asarray(im).copy();alpha=pixels[:,:,3]
 labels,count=ndimage.label(alpha>96);areas=np.bincount(labels.ravel())
 ids=(np.argsort(areas[1:])[-10:]+1).tolist()
 assert len(ids)==10 and min(areas[i] for i in ids)>10000, (key,'missing character components')
 centers={i:ndimage.center_of_mass(alpha>96,labels,i) for i in ids}
 ids.sort(key=lambda i:centers[i][0]);rows=[ids[:5],ids[5:]];out=[]
 for row in rows:
  for i in sorted(row,key=lambda i:centers[i][1]):
   mask=ndimage.binary_dilation(labels==i,iterations=3)
   y,x=np.where(mask);box=(x.min(),y.min(),x.max()+1,y.max()+1)
   part=pixels[box[1]:box[3],box[0]:box[2]].copy()
   part[:,:,3]*=mask[box[1]:box[3],box[0]:box[2]].astype(np.uint8)
   out.append(Image.fromarray(part,'RGBA'))
 return out

def bounds(im):
 return im.getchannel('A').point(lambda n:255 if n>=32 else 0).getbbox()

def fit(im,size,padding=12,bottom=None,scale=None):
 box=bounds(im);assert box, 'empty cell'
 im=im.crop(box);w,h=im.size
 s=scale or min((size[0]-2*padding)/w,(size[1]-2*padding)/h)
 im=im.resize((max(1,round(w*s)),max(1,round(h*s))),Image.Resampling.LANCZOS)
 out=Image.new('RGBA',size);out.alpha_composite(im,((size[0]-im.width)//2,(bottom-im.height) if bottom is not None else (size[1]-im.height)//2));return out

meta={}
def save(key,im):
 tmp=OUT/(key+'.webp');im.save(tmp,'WEBP',quality=90,method=6,exact=True)
 b=tmp.read_bytes();sha=hashlib.sha256(b).hexdigest();name=key+'-'+sha[:16]+'.webp';tmp.rename(OUT/name)
 meta[key]={'file':name,'sha256':sha,'bytes':len(b),'width':im.width,'height':im.height,'alpha':im.mode=='RGBA'}
 return name

names=['weapon_muhafiz','weapon_avci','weapon_arkanist','armor','helmet','necklace','shoes','emerald_dust','royal_crown']
iconcells=dict(zip(names,cells('icons',3,3)))
for key,im in iconcells.items():save('royal-icon-'+key+'-r118',fit(im,(128,128),6))
# Fullresolution separatearmorasset usedbylootrenderers withoutupleveling128pxicons.
save('royal-armor-r118',fit(iconcells['armor'],(256,256),10))
weaponcells=cells('weapons',3,1)
itematlas=Image.new('RGBA',(768,512))
for i,im in enumerate(weaponcells+[iconcells['helmet'],iconcells['necklace'],iconcells['shoes']]):
 itematlas.alpha_composite(fit(im,(256,256),12),((i%3)*256,(i//3)*256))
save('royal-set-r118',itematlas)
# Fixedrow-wise scale preserves animatedposeheight changes; feetbaselineexactly354.
hero=Image.new('RGBA',(1920,1098));parts=cells('hero',6,3)
for row in range(3):
 rowparts=parts[row*6:(row+1)*6];bs=[bounds(im) for im in rowparts]
 scale=min(292/max(b[2]-b[0] for b in bs),340/max(b[3]-b[1] for b in bs))
 for col,im in enumerate(rowparts):hero.alpha_composite(fit(im,(320,366),bottom=354,scale=scale),(col*320,row*366))
save('royal-hero-motion-r118',hero)
for key in ['ivory_guard','golden_lion','crescent_hunter','royal_colossus']:
 parts=sprite_parts(key);bs=[bounds(im) for im in parts]
 # Samebody scale across locomotionandattack, fixedgroundanchor y232.
 scale=min(236/max(b[2]-b[0] for b in bs),220/max(b[3]-b[1] for b in bs))
 atlas=Image.new('RGBA',(1280,512))
 for i,im in enumerate(parts):atlas.alpha_composite(fit(im,(256,256),bottom=232,scale=scale),((i%5)*256,(i//5)*256))
 save('champions-'+key+'-r118',atlas)
save('champions-map-r118',Image.open(SRC/'map.png').convert('RGB'))
(ROOT/'manifest.json').write_text(json.dumps({'version':'R118_ROYAL_ART1','assets':meta,'totalBytes':sum(x['bytes'] for x in meta.values()),'monsterFrames':{'columns':5,'rows':2,'cellWidth':256,'cellHeight':256,'footY':232,'facing':'right'},'heroFrames':{'columns':6,'rows':3,'cellWidth':320,'cellHeight':366,'footY':354,'roles':['muhafiz','avci','arkanist'],'facing':'left'}},ensure_ascii=False,indent=2)+'\n')
# Contactsheet compositedon same darkbackgroundforalpha inspection, not gameplayclaim.
preview=Image.new('RGB',(1400,1050),'#132019');draw=ImageDraw.Draw(preview)
draw.text((24,15),'R118 original art - Hukumdar Kraliyet / Sampiyonlar Diyari',fill='#efd39b')
for idx,key in enumerate(names):
 im=Image.open(OUT/meta['royal-icon-'+key+'-r118']['file']);x=24+idx*150;preview.paste(im,(x,50),im);draw.text((x,183),key,fill='#e9e1cf')
for idx,key in enumerate(['ivory_guard','golden_lion','crescent_hunter','royal_colossus']):
 im=Image.open(OUT/meta['champions-'+key+'-r118']['file']).crop((0,0,256,256));x=25+idx*340;preview.paste(im,(x,225),im);draw.text((x,490),key,fill='#e9e1cf')
for idx in range(3):
 im=hero.crop((0,idx*366,320,(idx+1)*366));preview.paste(im,(30+idx*330,550),im)
mapim=Image.open(SRC/'map.png').convert('RGB');mapim.thumbnail((420,300));preview.paste(mapim,(975,570))
preview.save(ROOT/'previews/contact-sheet.jpg',quality=94)
print(json.dumps({'assets':len(meta),'totalBytes':sum(x['bytes'] for x in meta.values()),'manifest':str(ROOT/'manifest.json')},indent=2))

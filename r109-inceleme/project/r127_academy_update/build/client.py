from pathlib import Path
from io import BytesIO
import hashlib
import numpy as np
from PIL import Image

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'assets'
BASE=ROOT.parent/'r125_rune_client/assets'
def store(prefix, ext, data):
    name=prefix+'-'+hashlib.sha256(data).hexdigest()[:16]+'.'+ext
    (OUT/name).write_bytes(data)
    return name

def build():
    # Preserve all 18 pivots, motion silhouettes and frame timings. Colourize
    # the emerald armour pixels while retaining skin, faces and shadow detail.
    source=Image.open(ROOT.parent/'r60_mount_work/design-r60/live-assets/game/hero-motion-emerald-v447.webp').convert('RGBA')
    pix=np.array(source)
    rgb=pix[:,:,:3].astype(float)
    h,s,v=np.array(source.convert('HSV')).transpose(2,0,1)/255.
    lum=(rgb@[.25,.58,.17])/255.
    metal=(h>.205)&(h<.59)&(s>.13)
    gold=np.stack([25+228*lum,15+198*lum,6+116*lum],axis=-1)
    ivory=np.stack([38+214*lum,39+211*lum,36+208*lum],axis=-1)
    trim=np.clip((s-.62)*3.4,0,1)[:,:,None]
    colour=np.maximum(0,np.minimum(255,ivory*(1-trim)+gold*trim))
    pix[:,:,:3]=np.where(metal[:,:,None],colour,rgb).round().astype('uint8')
    buf=BytesIO();Image.fromarray(pix).save(buf,'WEBP',lossless=True,method=4)
    atlas=store('royal-hero-motion-r127','webp',buf.getvalue())
    assert np.array_equal(np.array(Image.open(OUT/atlas))[:,:,3],np.array(source)[:,:,3])
    assert np.count_nonzero(metal & (pix[:,:,3]>127))>10000
    game,=BASE.glob('game-*.js');portal,=BASE.glob('auth-*.js')
    t=game.read_text()
    def replace(a,b,n=1):
        nonlocal t
        assert t.count(a)==n,(a,t.count(a),n)
        t=t.replace(a,b)
    replace('import {ROYAL_MEDIA_R118,','import {ROYAL_MEDIA_R118 as royalBaseMediaR118,')
    anchor='function colEmeraldPreload447(players) {'
    replace(anchor,"const ROYAL_MEDIA_R118=Object.freeze({...royalBaseMediaR118,hero:new URL('./"+atlas+"',import.meta.url).href});\n"+anchor+'''
  if(players?.some(p=>[p.armor_rarity,p.weapon_rarity,p.appearance?.armor,p.appearance?.weapon].includes('royal'))){
    Iy(ROYAL_MEDIA_R118.hero);Iy(ROYAL_MEDIA_R118.weapons);
  }''')
    replace('includes("royal-hero-motion-r118")','includes("royal-hero-motion-r")',2)
    replace('|| !e5 || e5.area !== "event" && !colRuneCoast483(e5.area)','|| !e5 || e5.area !== "champions" && e5.area !== "event" && !colRuneCoast483(e5.area)')
    replace('let t4 = { ...a3, drops: a3.drops.filter','let t4 = { ...a3, ...(e4.kind==="royal_crown"&&n3.materialBalance?.kind===e4.kind&&Number.isSafeInteger(n3.materialBalance.amount)?{dungeonMaterials:[...(a3.dungeonMaterials??[]).filter(row=>row.kind!==e4.kind),n3.materialBalance]}:{}), drops: a3.drops.filter')
    replace('e4.kind === `dragon_reward` ? I2.current = true','(e4.kind === `dragon_reward` || e4.kind === "royal_crown") ? I2.current = true')
    replace('e4.rarity === jo2 && e4.equipped === 0 && du(e4.kind)','bulkEligibleR127(e4,jo2)',2)
    replace('t4.rarity === e4 && t4.equipped === 0 && du(t4.kind) && t4.sale_locked499 !== 1','bulkEligibleR127(t4,e4)')
    for var in ['e4','jo2']:
        replace(var+' === `orange` ? Z2?.item_sale_orange ?? 30 : '+var+' === `blue` ? Z2?.item_sale_blue ?? 8 : Z2?.item_sale_white ?? 2','bulkPriceR127('+var+',Z2)')
    anchor='[`orange`, `Turuncu`]].map(([e4, t3]) => {\n    let n3'
    replace(anchor,'[`orange`, `Turuncu`],[`red`,`Kırmızı`],[`purple`,`Mor`]].map(([e4, t3]) => {\n    let n3')
    pivot=t.index('className: `market-offer-grid`');start=t.index('R.createElement(colExpansionUI456.Shop,',pivot)
    t=t[:start]+'R.createElement(StoneArtShopR127,{world:U2,own:X2,post:Q,refresh:async()=>{I2.current=true;await J(true);}}), '+t[start:]
    replace('U2?.dungeonMaterials?.filter((e4) => e4.amount > 0','(U2?.dungeonMaterials??[]).some(r=>r.kind==="stone_extractor"&&r.amount>0)&&R.createElement("div",{className:"bag-item rarity-red"},R.createElement("strong",null,"Taş Sanatı ×"+U2.dungeonMaterials.find(r=>r.kind==="stone_extractor").amount)), U2?.dungeonMaterials?.filter((e4) => e4.kind!=="stone_extractor" && e4.amount > 0')
    t+='\n'+(ROOT/'build/market-ui.js').read_text()
    new=store('game-client-core511-r127','js',t.encode())
    p=portal.read_text()
    assert game.name in p
    return new,store('auth-portal-core511-r127','js',p.replace(game.name,new).encode()),atlas

if __name__=='__main__':print(*build(),sep='\n')

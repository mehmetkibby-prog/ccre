function bulkEligibleR127(item, rarity) {
  return item.rarity === rarity && item.equipped === 0 && item.sale_locked499 !== 1 &&
    ['weapon','armor','helmet','shoes','necklace'].includes(item.kind);
}
function bulkPriceR127(rarity, settings) {
  if (rarity === 'purple') return 50;
  return settings?.['item_sale_' + rarity] ?? {white:2,blue:8,orange:30,red:100}[rarity];
}
function StoneArtShopR127({world, own, refresh, post}) {
  const h=R.createElement, [selection,select]=R.useState(''), [notice,setNotice]=R.useState(''), [busy,setBusy]=R.useState(false);
  const lock=R.useRef(false), retry=R.useRef(null);
  const stock=world?.dungeonMaterials?.find(row=>row.kind==='stone_extractor')?.amount??0;
  const labels={stone_critical:'Kritik Şansı',stone_attack:'Saldırı Gücü',stone_defense:'Savunma',stone_block:'Bloklama'};
  const options=[];
  for (const item of world?.inventory??[]) {
    if (item.sale_locked499===1 || !['weapon','armor'].includes(item.kind)) continue;
    for(const e of fu(item.enchantments,item.kind))if(Object.hasOwn(labels,e.kind)){
      const stoneKind=e.kind.slice(6)+':'+e.value;
      options.push({key:JSON.stringify([item.id,stoneKind]),itemId:item.id,stoneKind,label:item.item_name+' · '+labels[e.kind]+' +'+e.value});
    }
  }
  const chosen=options.find(option=>option.key===selection);
  async function submit(action) {
    if(lock.current || !own || (action==='extract_socket_stone'&&!chosen))return;
    const input=action==='buy_stone_extractor'?{action}:{action,itemId:chosen.itemId,stoneKind:chosen.stoneKind};
    const key=JSON.stringify([own.id,input]);
    if(retry.current && retry.current.key!==key){setNotice('Önce bekleyen işlemi tekrar dene.');return;}
    retry.current??={key,requestId:Uu()};
    lock.current=true;setBusy(true);
    try {
      const result=await post('/api/action',{...input,requestId:retry.current.requestId});
      retry.current=null;setNotice(result.message);
      if(action==='extract_socket_stone')select('');
      await refresh();
    }catch(err){
      if(err.status>=400&&err.status<500&&![408,429].includes(err.status))retry.current=null;
      setNotice(err.message??'İşlemi tekrar dene.');
    }finally{lock.current=false;setBusy(false);}
  }
  return h('div',{className:'market-card', 'data-stone-art':'shop'},
    h('span',{className:'market-card-icon exchange-icon','aria-hidden':true},h(Cn)),
    h('div',null,h('strong',null,'Taş Sanatı'),h('small',null,'200 Mücevher · Çantanda '+stock+' adet'),
      h('small',null,'Bir taşı eşyadan çıkarır ve aynı değeriyle çantana verir.')),
    h('button',{type:'button',disabled:busy||!own||own.hp<=0||own.gems<200,onClick:()=>submit('buy_stone_extractor')},'200 Mücevhere Al'),
    stock>0&&h('label',null,'Çıkarılacak taş',h('select',{value:selection,disabled:busy,onChange:event=>select(event.target.value)},
      h('option',{value:''},'Eşya ve taş seç'),...options.map(o=>h('option',{key:o.key,value:o.key},o.label)))),
    stock>0&&h('button',{type:'button',disabled:busy||!chosen||!own||own.hp<=0,onClick:()=>submit('extract_socket_stone')},'1 Taş Sanatı Kullan'),
    notice&&h('small',{role:'status'},notice));
}

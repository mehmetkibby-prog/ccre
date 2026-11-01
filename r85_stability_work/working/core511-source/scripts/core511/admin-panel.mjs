// Pure React display helper; no gameplay state, timers, fetch or credentials.
// It is inserted into the pinned native load-panel factory by the assembler.
export function kernelMetricsCard511(h,row,fmt){
 if(row.key==='main')return null;
 const value=row.kernel511;
 if(!value)return h('p',{role:'status',style:{fontSize:11,color:'#a1aaa6'}},'Tick ölçümü bekleniyor.');
 const channel=row.key.startsWith('channel-'),fields=[['Tick p95',value.tickP95Ms,' ms'],['En uzun tick',value.maxTickMs,' ms'],...(channel?[['Mesaj / sn',value.messagesPerSecond,''],['Kayıt onayı p95',value.writerAckP95Ms,' ms']]:[])];
 const ticks=(Array.isArray(value.slowest)?value.slowest:[]).slice(0,10).filter(t=>Number.isSafeInteger(t.tick)&&Number.isFinite(t.ms)&&t.ms>=0);
 return h('div',{className:'col-kernel511-metrics',style:{marginTop:12,paddingTop:10,borderTop:'1px solid #53735b66'}},
  h('dl',null,...fields.map(([label,n,suffix])=>h('div',{key:label},h('dt',null,label),h('dd',null,fmt(Number.isFinite(n)&&n>=0?n:null)+suffix)))),
  h('details',{style:{marginTop:12,fontSize:11}},h('summary',{style:{cursor:'pointer'}},'En yavaş 10 tick'),
   ticks.length?h('ol',{style:{margin:'8px 0 0',paddingLeft:22}},...ticks.map(t=>h('li',{key:t.tick,style:{padding:'3px 0',fontVariantNumeric:'tabular-nums',color:t.ms>50?'#f18380':undefined}},'#'+t.tick+' · '+fmt(t.ms)+' ms'))):h('p',null,'Henüz tick örneği yok.')));
}

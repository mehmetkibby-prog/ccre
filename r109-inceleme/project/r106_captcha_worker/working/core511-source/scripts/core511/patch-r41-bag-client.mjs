import {createHash} from 'node:crypto';
const hash=value=>createHash('sha256').update(value).digest('hex');
export function patchR41BagClient(source,helper){
 if(!/^core511-r41-bag-[a-f0-9]{16}\.js$/.test(helper))throw Error('r41_bag_helper_name');
 let output=source;const edits=[];
 const one=(from,to)=>{const count=output.split(from).length-1;if(count!==1)throw Error('r41_bag_client_anchor:'+from.slice(0,120)+':'+count);output=output.replace(from,to);edits.push({from,to,count:1});};
 const head=`import {createBagGuardR41,createBagCapacityR41,loadBagOptionsR41} from './${helper}';\n`;output=head+output;edits.push({position:'prepend',from:'',to:head});
 const begin='  let Tm2 = (0, R.useCallback)(async (e4, t3 = false) => {\n    if (!Dr2.current.has(e4.id)) {\n      Dr2.current.add(e4.id), fr2.current += 1;';
 one(begin,'  const bagGuardR41=R.useRef(null);bagGuardR41.current??=createBagGuardR41();\n'+begin+'\n      let bagFullR41=false;');
 const caught='        kr2.current.set(e4.id, performance.now() + 1500), t3 || K2(n3 instanceof Error ? n3.message : `Toplama ba\\u015Far\\u0131s\\u0131z.`), I2.current = true;';
 one(caught,'        if(bagGuardR41.current.reject(n3,e4,F2.current,K2,performance.now(),g2.current)){bagFullR41=true;kr2.current.delete(e4.id);}else{\n'+caught+'\n        }');
 const done='        _e2.current += 1, Dr2.current.delete(e4.id), fr2.current = Math.max(0, fr2.current - 1), J().then(() => {\n          (at2.current || I2.current) && J();\n        });';
 one(done,'        if(bagFullR41){Dr2.current.delete(e4.id);fr2.current=Math.max(0,fr2.current-1);}else{\n'+done+'\n        }');
 one('      let e5 = F2.current;\n      if (!v2.current || !e5 || e5.area !== \"event\"', '      let e5 = F2.current;\n      if(v2.current&&e5)bagGuardR41.current.warnOverflow(e5,K2,performance.now(),g2.current);\n      if (!v2.current || !e5 || e5.area !== \"event\"');
 const select='r3 = e5.drops.find((e6) => (e6.collectible_at ?? 0) <= t3 && !Dr2.current.has(e6.id) && (kr2.current.get(e6.id) ?? 0) <= n3);';
 one(select,select.replace('<= n3);','<= n3 && bagGuardR41.current.allowAuto(e6,e5,K2,n3,g2.current));'));
 one('R.createElement(r40UI.BagCapacity,{inventory:U2?.inventory})','R.createElement(r41BagCapacity,{inventory:U2?.inventory,pending:U2?.adventure511?.bagPending})');
 const tail='\nconst r41BagCapacity=createBagCapacityR41(R,r40UI.BagCapacity);\nvoid loadBagOptionsR41();\n';output+=tail;edits.push({position:'append',from:'',to:tail});
 return {source:output,proof:{sourceSha256:hash(source),patchedSha256:hash(output),helper,edits,scope:'Only full-bag automatic equipment selection, sparse visible warning, bag_full nonretryable cleanup without world refresh, and pending bag-counter text. Existing movement, rendering, transport and R40 fixes retain byte identity after inverse.'}};
}

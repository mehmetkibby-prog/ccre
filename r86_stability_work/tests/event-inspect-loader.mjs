export async function load(url,context,nextLoad){
 const result=await nextLoad(url,context);
 if(!url.endsWith('/generated/attack-writer-rules.mjs?event-inspect-r86'))return result;
 const source=String(result.source),needle='return Object.freeze({mixedNative,mixedMemory,';
 if(source.split(needle).length!==2)throw Error('unexpected event inspection source');
 return {...result,source:source.replace(needle,'return Object.freeze({readEventsConfig,parseEvents,eventOccurrence499,mixedNative,mixedMemory,')};
}

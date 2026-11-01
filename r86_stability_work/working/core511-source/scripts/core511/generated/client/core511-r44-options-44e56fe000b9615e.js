const disabled=Object.freeze({remoteMotionPrediction:false});
let options=disabled,loading;
export const readR44ClientOptions=()=>options;
export function loadR44ClientOptions(request=globalThis.fetch){
 return loading??=Promise.resolve().then(()=>request('/api/core511-r44-options',{credentials:'same-origin',cache:'no-store'})).then(async response=>{
  if(!response.ok)throw Error('r44_options_unavailable');const value=await response.json();
  options=Object.freeze({remoteMotionPrediction:value?.remoteMotionPrediction===true});return options;
 }).catch(()=>disabled);
}
if(typeof window!=='undefined')void loadR44ClientOptions();

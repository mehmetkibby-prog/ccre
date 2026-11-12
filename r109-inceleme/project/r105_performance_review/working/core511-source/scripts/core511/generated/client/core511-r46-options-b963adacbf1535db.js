const disabled=Object.freeze({frameMotionClock:false});
let options=disabled,loading;
export const readR46ClientOptions=()=>options;
export function loadR46ClientOptions(request=globalThis.fetch){
 return loading??=Promise.resolve().then(()=>request('/api/core511-r46-options',{credentials:'same-origin',cache:'no-store'})).then(async response=>{
  if(response.ok){const value=await response.json();options=Object.freeze({frameMotionClock:value?.frameMotionClock===true});}return options;
 }).catch(()=>options);
}
if(typeof window!=='undefined')void loadR46ClientOptions();

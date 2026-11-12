const disabled=Object.freeze({continuousRemoteMotion:false});
let options=disabled,loading;
export const readR45ClientOptions=()=>options;
export function loadR45ClientOptions(request=globalThis.fetch){
 return loading??=Promise.resolve().then(()=>request('/api/core511-r45-options',{credentials:'same-origin',cache:'no-store'})).then(async response=>{
  if(response.ok){const value=await response.json();options=Object.freeze({continuousRemoteMotion:value?.continuousRemoteMotion===true});}return options;
 }).catch(()=>options);
}
if(typeof window!=='undefined')void loadR45ClientOptions();

export const clientGameplayR60={mountMaterials:false,mountState:false,mountRender:false,castleNotices:false};
export function acceptGameplayR60(flags){for(const key of Object.keys(clientGameplayR60))clientGameplayR60[key]=flags?.[key]===true;}
const materials=Object.freeze({saddle_leather:'Sağlam Deri',saddle_buckle:'Eyer Tokası',saddle_rein:'Dizgin Parçası'});
const art='/assets/mount-materials-r60.webp';
export function mountMaterialIconR60(React,kind){
 if(!clientGameplayR60.mountMaterials||!Object.hasOwn(materials,kind))return null;
 const index=Object.keys(materials).indexOf(kind);
 return React.createElement('span',{className:'mount60-material-icon',role:'img','aria-label':materials[kind],style:{display:'inline-block',width:48,height:48,maxWidth:'100%',flexShrink:0,backgroundImage:`url("${art}")`,backgroundSize:'300% 100%',backgroundPosition:`${index*50}% 0`,backgroundRepeat:'no-repeat'}});
}
export function mountMarketEntriesR60(world,React){
 return clientGameplayR60.mountMaterials?Object.entries(materials).map(([kind,label])=>({id:'part:'+kind,kind:'dungeon_material',materialKind:kind,label,amount:world?.dungeonMaterials?.find(row=>row.kind===kind)?.amount??0,icon:mountMaterialIconR60(React,kind)})):[];
}
export function createMountMaterialsR60(React){
 const h=React.createElement;
 return function MountMaterials({world}){
  return h(React.Fragment,null,...mountMarketEntriesR60(world,React).filter(row=>row.amount>0).map(row=>h('article',{key:row.materialKind,className:'bag-item tower27-material'},h('div',{className:'item-icon'},row.icon),h('div',{className:'tower27-label'},h('strong',null,row.label+' × '+row.amount),h('small',null,'Eyer üretim malzemesi · Oyuncu pazarında satılabilir.')))));
 };
}

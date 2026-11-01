import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const pins={
 'death-batch-single-r57.mjs':'88985b87dfde9b96c0d1c904376f5347f51f665482ce9f4a99ffa6638dfc17de',
 'attack-loop.mjs':'450267945b0787f846f591a74b05f4a15bed709443abd2e49cef075783af5cb8',
 'death-batch-writer-r57.mjs':'286ac833d5ad587e2727bf005b41096942b62766c6f5ca66489b2e96862e085b',
 'command-failure-scope.mjs':'3a3bae2a9fe71f33106f8e4023299c5bb2cc638ca41720e47f568904f5bbba43'
};
export async function load(url,context,next){
 const result=await next(url,context),name=url.split('/').at(-1);
 if(process.env.R85_DEATH_BATCH_FIXED_SEEDS==='1'&&url.includes('/working/core511-source/scripts/core511/')&&name==='planned-attack-seed-r57.mjs'){
  const source=String(result.source);if(createHash('sha256').update(source).digest('hex')!=='f07dd0c7497df41934cdd2bba31c27be3915441a5abad84834d5c1bbc3b91f2e')throw Error('independent_death_seed_source_drift');
  return {...result,source:"import {createHash as fixtureHashR85} from 'node:crypto';\nconst fixtureSeedR85=context=>fixtureHashR85('sha256').update('native-independent-r85:'+context.id+':'+context.inputOrder).digest('hex');\n"+source.replaceAll('OperationRandom.seed()','fixtureSeedR85(context)')};
 }
 if(process.env.R85_DEATH_BATCH_CANDIDATE!=='1'||!url.includes('/working/core511-source/scripts/core511/')||!Object.hasOwn(pins,name))return result;
 if(createHash('sha256').update(String(result.source)).digest('hex')!==pins[name])throw Error('independent_death_baseline_drift:'+name);
 return {...result,source:readFileSync(new URL('../../candidates/independent-deaths-r85/'+name,import.meta.url),'utf8')};
}

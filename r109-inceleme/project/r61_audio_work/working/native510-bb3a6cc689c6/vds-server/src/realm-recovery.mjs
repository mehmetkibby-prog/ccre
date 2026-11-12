// Package rollback never restores a database backup. The host adapter verifies
// compatible signed-by-checksum inventory before stopping any running service.
export async function recoverRealmPackage({target,operations}){
 await operations.verify(target);const previous=await operations.current();
 if(target===previous)return {ok:true,unchanged:true};
 await operations.stop();
 try{
  await operations.select(target);await operations.start();
  if(!await operations.healthy())throw new Error('Recovery health failed');
  await operations.remember(previous);return {ok:true,previous,current:target};
 }catch(error){
  const failures=[];
  for(const task of [()=>operations.stop(),()=>operations.select(previous),()=>operations.start()])try{await task();}catch(e){failures.push(e);}
  if(failures.length)throw new AggregateError([error,...failures],'Package rollback and restoration failed');
  throw error;
 }
}

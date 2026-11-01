import {measureRuntimeWork} from './runtime-performance.mjs';
// Adapts the ORIGINAL dungeon calculation to the realm writer. This is the
// persistence boundary; it does not select rooms, route players or start a
// second timer. The channel runtime supplies those ownership decisions.
export class ChannelDungeonTransaction {
  constructor({engine,workspace,load,commit,onFatal=()=>{},withContext=(_plan,fn)=>fn()}){
    this.engine=engine;this.workspace=workspace;this.load=load;this.commit=commit;this.onFatal=onFatal;
    this.tail=Promise.resolve();this.pending=false;this.failed=null;this.withContext=withContext;
  }
  run(operation,{runIds=null}={}){
    const work=this.tail.then(async()=>{
      if(this.failed)throw this.failed;
      const engine=this.engine;
      // Keep the published map unchanged until durable completion. The live
      // algorithm sees private candidate runs, including all random loot rolls.
      const prior={runs:engine.runs,notices:engine.notices,lastSave:engine.lastSave,persistedAt:engine.persistedAt,lastTick:engine.lastTick};
      const restore=()=>{Object.assign(engine,prior);};
      this.pending=true;
      let awaitingCommit=false;
      try{
        await this.load(this.workspace,{runIds});
        const plan=this.workspace.plan(),originalDb=engine.db;
        const affected=runIds??[...prior.runs.keys()],runs=new Map(prior.runs);
        for(const id of affected)if(runs.has(id))runs.set(id,structuredClone(runs.get(id)));
        Object.assign(engine,{runs,notices:structuredClone(prior.notices),lastSave:new Map(prior.lastSave),persistedAt:new Map(prior.persistedAt)});
        let result,trace,candidate;
        try{
          engine.db=plan;
          for(const id of affected){
            const current=plan.prepare('SELECT updated_at FROM dungeon_runs WHERE id=?').get(id);
            if((current?.updated_at)!==prior.persistedAt.get(id))throw Object.assign(Error('Zindan kaydı değişti.'),{code:'native_snapshot_changed'});
          }
          result=measureRuntimeWork('dungeon_step',()=>this.withContext(plan,()=>operation(engine)));
          if(result&&typeof result.then==='function')throw Error('Dungeon calculation must finish synchronously');
          trace=plan.finish();
          candidate={runs:engine.runs,notices:engine.notices,lastSave:engine.lastSave,persistedAt:engine.persistedAt,lastTick:engine.lastTick};
        }finally{engine.db=originalDb;restore();}
        if(trace){
          awaitingCommit=true;
          const ack=await this.commit(trace);
          awaitingCommit=false;
          if(!ack.committed)throw Object.assign(Error('Zindan durumu değişti; işlemi tekrar dene.'),{code:'native_snapshot_changed',step:ack.step});
        }
        Object.assign(engine,candidate);
        return result;
      }catch(error){
        restore();
        // An explicit snapshot conflict is a known rollback, not an unknown
        // outcome. A lost writer reply must fence this engine incarnation.
        if(awaitingCommit||['ipc_outcome_unknown','ipc_disconnected'].includes(error.code)){this.failed=error;this.onFatal(error);}
        throw error;
      }finally{this.pending=false;}
    });
    this.tail=work.catch(()=>{});return work;
  }
  async drain(){await this.tail;if(this.failed)throw this.failed;}
}

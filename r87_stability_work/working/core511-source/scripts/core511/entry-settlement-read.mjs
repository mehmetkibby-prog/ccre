import {demand} from './contract.mjs';
import {coldSettlementResources} from './settlement-resources.mjs';

// The authenticated coordinator owns this read scope. Its lease identity is
// not an admission or a simulated player owner and cannot issue game commands.
export class EntrySettlementRead {
 static needed(core,session,channel){const player=core.database.sqlite.prepare('SELECT channel FROM players WHERE id=?').get(session.player.id);return player?.channel!==channel&&coldSettlementResources(core.database.sqlite,session.player.id).length>0;}
 constructor(core,session,peer){this.core=core;this.session=session;this.source=session.player.id;this.peer=peer;this.phase='freezing';this.settlement=null;demand(!core.entryReads.has(this.source),'entry_read_duplicate');core.entryReads.set(this.source,this);}
 assertUnadmitted(){const c=this.core;demand(c.entryReads.get(this.source)===this&&!c.authority.admission(this.source)&&!c.authority.simulation(this.source),'entry_read_owner_changed');c.process(this.peer);c.entry.assertSession(c.database.sqlite,this.session);}
 async freeze(){this.assertUnadmitted();demand(this.core.sharedWorld?.combat,'entry_read_world_required');this.settlement=await this.core.sharedWorld.combat.acquireCold(this);this.assertUnadmitted();await this.core.sharedWorld.combat.checkpointCold(this.settlement,this);this.phase='frozen';}
 async release(){if(this.settlement){await this.core.sharedWorld.combat.finishCold(this.settlement,this);this.settlement=null;}demand(this.core.entryReads.get(this.source)===this,'entry_read_replaced');this.core.entryReads.delete(this.source);this.phase='released';}
 fail(error){if(this.phase==='unknown'||this.phase==='released')return;this.phase='unknown';this.core.entryReads.delete(this.source);this.core.sharedWorld?.combat.fail(error);}
}

import {createMaintenance438} from '../../../native510-bb3a6cc689c6/vds-server/src/maintenance438.mjs';
import {demand} from './contract.mjs';

// The exact native policy/deadline implementation, with the GM query replaced
// by this channel's authoritative resident map. No per-pong/input SQL.
export class ResidentMaintenance {
 constructor({player,clock=Date.now}){
  this.player=player;this.accounts=new Map();this.actors=new Map();
  this.policy=createMaintenance438({now:clock,isGameMaster:account=>this.player(this.accounts.get(account))?.is_gm===1});
 }
 hydrate(player){if(player.account_id){this.accounts.set(player.account_id,player.id);this.actors.set(player.id,player.account_id);}}
 forget(actor){const account=this.actors.get(actor);if(account&&this.accounts.get(account)===actor)this.accounts.delete(account);this.actors.delete(actor);}
 apply(frame){this.policy.apply(frame);demand(this.policy.policy?.revision>=frame.revision,'maintenance_revision');return {revision:this.policy.policy.revision};}
 close(){this.policy.close();this.accounts.clear();this.actors.clear();}
}

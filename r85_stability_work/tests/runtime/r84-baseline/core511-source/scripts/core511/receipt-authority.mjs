import {ChannelAuthority as OriginalAuthority} from './generated/owner-authority.mjs';
import {opaqueId,requestDigest,channelError} from './generated/owner-protocol.mjs';
import {prepareCached477} from './writer-statements.mjs';
import {r35Options} from './r35-options.mjs';
import {writeReceipt,readReceipt} from './compact-receipt.mjs';

// The generated/native authority stays byte-identical. This command retains
// its exact digest, epoch, sequence, transaction and durability guards; only
// receipt encoding/decoding differs. Tests compare the guard implementation.
export class ChannelAuthority extends OriginalAuthority {
 async initialize(){
  await super.initialize();
  if(r35Options.compactReceipt)await this.database.atomic(sql=>sql.exec(`
   CREATE TABLE IF NOT EXISTS kernel511_receipt_overflow(
    operation_id TEXT PRIMARY KEY REFERENCES kernel511_channel_receipts(operation_id) ON DELETE CASCADE,
    payload TEXT NOT NULL);
  `));
 }
  command(peer, request) {
    const {playerId, epoch, sequence, operationId, operation, payload} = request;
    opaqueId(playerId); opaqueId(operationId);
    if (!Number.isSafeInteger(epoch) || epoch < 1 || !Number.isSafeInteger(sequence) || sequence < 1 || !Object.hasOwn(this.operations, operation)) {
      return Promise.reject(channelError('invalid_channel_command'));
    }
    const definition = this.operations[operation];
    const digest = requestDigest({realmId: this.realmId, channel: peer.channel, playerId, epoch, sequence, operation, payload});
    return this.database.atomic(db => {
      this.assertProcess(peer.channel, peer.incarnation, db);
      const previous = prepareCached477(db,'SELECT * FROM kernel511_channel_receipts WHERE operation_id=?').get(operationId);
      if (previous) {
        if (previous.digest !== digest) throw channelError('operation_id_reused');
        this.stats.replays++;
        return readReceipt(db, previous.response);
      }
      const owner = this.owner(playerId, db);
      if (!owner || owner.epoch !== epoch || owner.channel !== peer.channel || owner.incarnation !== peer.incarnation ||
          (owner.state !== 'active' && !(owner.state === 'draining' && definition.duringDrain === true))) {
        this.stats.rejected++; throw channelError('owner_epoch_fenced');
      }
      if (sequence !== owner.sequence + 1) throw channelError(sequence <= owner.sequence ? 'operation_already_retired' : 'operation_sequence_gap');
      // Game operation validates session/scope and existing game-rule guards in
      // this SAME transaction. The owner fence is additional, not a replacement.
      if (definition.execute?.constructor?.name === 'AsyncFunction') throw channelError('operation_must_be_synchronous');
      const result = definition.execute(db, {playerId, epoch, payload, owner, operationId});
      if (result && typeof result.then === 'function') throw channelError('operation_must_be_synchronous');
      const saved = writeReceipt(result, operationId);
      const response = saved.response;
      prepareCached477(db,'INSERT INTO kernel511_channel_receipts VALUES(?,?,?,?,?,?,?)')
        .run(operationId, playerId, epoch, sequence, digest, response, this.now());
      if (saved.overflow) prepareCached477(db,'INSERT INTO kernel511_receipt_overflow(operation_id,payload) VALUES(?,?)').run(operationId,saved.overflow);
      prepareCached477(db,'UPDATE kernel511_channel_owners SET sequence=?,updated_ms=? WHERE player_id=?').run(sequence, this.now(), playerId);
      this.stats.commands++;
      return result;
    }); // LocalDatabase resolves only AFTER durableAfterCommit / WAL fsync.
  }
}

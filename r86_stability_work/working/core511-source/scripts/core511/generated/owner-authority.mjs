import {prepareCached477} from "../../../../native510-bb3a6cc689c6/vds-server/src/prepared-statements477.mjs";
import {channelNumber, opaqueId, requestDigest, jsonBytes, channelError} from './owner-protocol.mjs';

// A realm-local authority. This module and LocalDatabase live only in the main
// process. Child handlers select a registered operation; arbitrary SQL is never
// accepted from the wire. Each receipt is committed WITH its state change.
export class ChannelAuthority {
  constructor(database, {realmId, operations = {}, now = Date.now} = {}) {
    this.database = database; this.realmId = opaqueId(realmId); this.operations = operations; this.now = now;
    this.stats = {commands: 0, replays: 0, rejected: 0, transfers: 0, restarts: 0};
  }
  async initialize() {
    await this.database.atomic(db => db.exec(`
      CREATE TABLE IF NOT EXISTS kernel511_channel_processes(
        channel INTEGER PRIMARY KEY CHECK(channel BETWEEN 1 AND 4),
        incarnation TEXT NOT NULL, online INTEGER NOT NULL CHECK(online IN (0,1)));
      CREATE TABLE IF NOT EXISTS kernel511_channel_owners(
        player_id TEXT PRIMARY KEY, channel INTEGER NOT NULL CHECK(channel BETWEEN 1 AND 4),
        epoch INTEGER NOT NULL, incarnation TEXT NOT NULL,
        state TEXT NOT NULL CHECK(state IN ('active','draining','released')),
        transfer_id TEXT, target_channel INTEGER, sequence INTEGER NOT NULL DEFAULT 0,
        release_sequence INTEGER, updated_ms INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS kernel511_channel_receipts(
        operation_id TEXT PRIMARY KEY, player_id TEXT NOT NULL, epoch INTEGER NOT NULL,
        sequence INTEGER NOT NULL, digest TEXT NOT NULL, response TEXT NOT NULL,
        created_ms INTEGER NOT NULL, UNIQUE(player_id,epoch,sequence));
      CREATE INDEX IF NOT EXISTS kernel511_channel_owner_channel ON kernel511_channel_owners(channel,state);
      CREATE INDEX IF NOT EXISTS kernel511_channel_receipt_expiry ON kernel511_channel_receipts(created_ms);
    `));
  }
  owner(id, db = this.database.sqlite) {
    return prepareCached477(db,'SELECT * FROM kernel511_channel_owners WHERE player_id=?').get(opaqueId(id)) ?? null;
  }
  assertProcess(channel, incarnation, db) {
    const process = prepareCached477(db,'SELECT incarnation,online FROM kernel511_channel_processes WHERE channel=?').get(channelNumber(channel));
    if (!process?.online || process.incarnation !== incarnation) throw channelError('channel_process_fenced');
  }
  async registerProcess(channel, incarnation) {
    channelNumber(channel); opaqueId(incarnation);
    return this.database.atomic(db => {
      const previous = prepareCached477(db,'SELECT * FROM kernel511_channel_processes WHERE channel=?').get(channel);
      if (previous?.incarnation === incarnation && previous.online) return {channel, incarnation};
      prepareCached477(db,`INSERT INTO kernel511_channel_processes VALUES(?,?,1)
        ON CONFLICT(channel) DO UPDATE SET incarnation=excluded.incarnation,online=1`).run(channel, incarnation);
      // Restart does not complete a half handoff. It returns recovery ownership
      // to the OLD channel with a fresh epoch, from the last durable checkpoint.
      prepareCached477(db,`UPDATE kernel511_channel_owners SET epoch=epoch+1,incarnation=?,state='active',
        transfer_id=NULL,target_channel=NULL,sequence=0,release_sequence=NULL,updated_ms=? WHERE channel=?`)
        .run(incarnation, this.now(), channel);
      if (previous) this.stats.restarts++;
      return {channel, incarnation};
    });
  }
  async disconnectProcess(channel, incarnation) {
    return this.database.atomic(db => {
      prepareCached477(db,'UPDATE kernel511_channel_processes SET online=0 WHERE channel=? AND incarnation=?').run(channelNumber(channel), incarnation);
      return {ok: true};
    });
  }
  async claim(playerId, channel, incarnation) {
    opaqueId(playerId); channelNumber(channel);
    return this.database.atomic(db => {
      this.assertProcess(channel, incarnation, db);
      const owner = this.owner(playerId, db);
      if (owner) {
        if (owner.channel !== channel || owner.incarnation !== incarnation || owner.state !== 'active') throw channelError('player_already_owned');
        return owner;
      }
      prepareCached477(db,`INSERT INTO kernel511_channel_owners(player_id,channel,epoch,incarnation,state,updated_ms)
        VALUES(?,?,1,?,'active',?)`).run(playerId, channel, incarnation, this.now());
      return this.owner(playerId, db);
    });
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
        return JSON.parse(previous.response);
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
      const response = jsonBytes(result, 256 * 1024);
      prepareCached477(db,'INSERT INTO kernel511_channel_receipts VALUES(?,?,?,?,?,?,?)')
        .run(operationId, playerId, epoch, sequence, digest, response, this.now());
      prepareCached477(db,'UPDATE kernel511_channel_owners SET sequence=?,updated_ms=? WHERE player_id=?').run(sequence, this.now(), playerId);
      this.stats.commands++;
      return result;
    }); // LocalDatabase resolves only AFTER durableAfterCommit / WAL fsync.
  }
  async beginTransfer(playerId, {epoch, targetChannel, transferId}) {
    channelNumber(targetChannel); opaqueId(transferId);
    return this.database.atomic(db => {
      const owner = this.owner(playerId, db);
      if (!owner || owner.epoch !== epoch) throw channelError('owner_epoch_fenced');
      if (owner.transfer_id === transferId && owner.target_channel === targetChannel) return owner;
      if (owner.state !== 'active' || owner.channel === targetChannel) throw channelError('invalid_channel_transfer');
      this.assertProcess(owner.channel, owner.incarnation, db);
      prepareCached477(db,`UPDATE kernel511_channel_owners SET state='draining',transfer_id=?,target_channel=?,updated_ms=? WHERE player_id=?`)
        .run(transferId, targetChannel, this.now(), playerId);
      return this.owner(playerId, db);
    });
  }
  async release(playerId, peer, {epoch, transferId, finalSequence}) {
    return this.database.atomic(db => {
      this.assertProcess(peer.channel, peer.incarnation, db);
      const owner = this.owner(playerId, db);
      if (!owner || owner.epoch !== epoch || owner.channel !== peer.channel || owner.incarnation !== peer.incarnation ||
          owner.transfer_id !== transferId || !['draining', 'released'].includes(owner.state)) throw channelError('owner_epoch_fenced');
      if (owner.sequence !== finalSequence) throw channelError('channel_not_drained');
      prepareCached477(db,`UPDATE kernel511_channel_owners SET state='released',release_sequence=sequence,updated_ms=? WHERE player_id=?`).run(this.now(), playerId);
      return this.owner(playerId, db);
    });
  }
  async releaseWritten(playerId,peer,{epoch,transferId,writerSequence}) {
    return this.database.atomic(db=>{
      this.assertProcess(peer.channel,peer.incarnation,db);
      const owner=this.owner(playerId,db);
      const stream=prepareCached477(db,'SELECT sequence FROM kernel511_channel_write_streams WHERE channel=? AND incarnation=?').get(peer.channel,peer.incarnation);
      if(!Number.isSafeInteger(writerSequence)||writerSequence<0||writerSequence>(stream?.sequence??0))throw channelError('channel_not_drained');
      if(!owner||owner.epoch!==epoch||owner.channel!==peer.channel||owner.incarnation!==peer.incarnation||owner.transfer_id!==transferId||!['draining','released'].includes(owner.state))throw channelError('owner_epoch_fenced');
      prepareCached477(db,"UPDATE kernel511_channel_owners SET state='released',release_sequence=sequence,updated_ms=? WHERE player_id=?").run(this.now(),playerId);
      return this.owner(playerId,db);
    });
  }
  async cancelTransfer(playerId,peer,{epoch,transferId}){
    return this.database.atomic(db=>{
      this.assertProcess(peer.channel,peer.incarnation,db);const owner=this.owner(playerId,db);
      if(!owner||owner.epoch!==epoch||owner.channel!==peer.channel||owner.incarnation!==peer.incarnation||owner.transfer_id!==transferId||!['draining','released'].includes(owner.state))throw channelError('owner_epoch_fenced');
      prepareCached477(db,"UPDATE kernel511_channel_owners SET state='active',transfer_id=NULL,target_channel=NULL,release_sequence=NULL,updated_ms=? WHERE player_id=?").run(this.now(),playerId);
      return this.owner(playerId,db);
    });
  }
  async acceptTransfer(playerId, peer, {epoch, transferId}, transition) {
    return this.database.atomic(db => {
      this.assertProcess(peer.channel, peer.incarnation, db);
      const owner = this.owner(playerId, db);
      if (!owner || owner.state !== 'released' || owner.epoch !== epoch || owner.transfer_id !== transferId ||
          owner.target_channel !== peer.channel || owner.release_sequence !== owner.sequence) throw channelError('channel_not_released');
      // The caller supplies the existing channel-capacity/combat/area guard,
      // not a simplified capacity rule. Failure rolls back ownership as well.
      if (typeof transition !== 'function') throw channelError('transition_guard_required');
      const accepted = transition(db, owner);
      if (accepted && typeof accepted.then === 'function') throw channelError('transition_must_be_synchronous');
      if (accepted !== true) throw channelError('transition_rejected');
      prepareCached477(db,`UPDATE kernel511_channel_owners SET channel=?,epoch=epoch+1,incarnation=?,state='active',
        transfer_id=NULL,target_channel=NULL,sequence=0,release_sequence=NULL,updated_ms=? WHERE player_id=?`)
        .run(peer.channel, peer.incarnation, this.now(), playerId);
      this.stats.transfers++;
      return this.owner(playerId, db);
    });
  }
  async pruneReceipts(beforeMs, limit = 32) {
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 128) throw new Error('Invalid receipt batch');
    // Retired sequence watermarks remain in kernel511_channel_owners, so old messages
    // cannot become new operations when a receipt expires.
    return this.database.atomic(db => prepareCached477(db,`DELETE FROM kernel511_channel_receipts WHERE operation_id IN
      (SELECT operation_id FROM kernel511_channel_receipts WHERE created_ms<? ORDER BY created_ms LIMIT ?)`).run(beforeMs, limit));
  }
}

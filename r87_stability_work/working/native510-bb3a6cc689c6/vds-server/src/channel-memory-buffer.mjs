import {perfR11Features} from './perf-r11-features.mjs';
import {POSITION_FIELDS} from './position-store.mjs';

const ackRowReuseR11 = perfR11Features.enabled('ackRowReuse');
const ackMemoryNoopR11 = perfR11Features.enabled('ackMemoryNoop');

const positionFields = ['id',...POSITION_FIELDS,'area','channel','arena_match_id','realtime_scope_version'];
const pick = (row, fields) => row ? Object.fromEntries(fields.filter(f => Object.hasOwn(row, f)).map(f => [f,row[f]])) : null;
const identity = (table, keys) => table + '\u001e' + keys.join('\u001f');

// A channel owns both buffers. Taking a checkpoint detaches only the generation
// being written; movement can keep editing its next generation during WAL fsync.
export class ChannelMemoryBuffer {
  constructor(positions, combat) { this.positions = positions; this.combat = combat; }
  take(includeCombat = () => true) {
    const positions = [], combat = [], deltas = [];
    for (const id of this.positions.pendingWrites.keys()) {
      const e = this.positions.entries.get(id);
      if (!e || e.writtenGeneration === e.generation) continue;
      const before = pick(e.base, positionFields), after = pick(e.current, positionFields);
      positions.push({id,e,generation:e.generation,after});
      deltas.push({table:'position',keys:[id],before,after});
      this.positions.pendingWrites.delete(id);
    }
    for (const {name,id,e} of this.combat.dirty.values()) {
      if (e.generation === e.written || !includeCombat(name,e.keys,e.current)) continue;
      const {spec} = this.combat.tables.get(name);
      const fields = spec.fields === spec.columns ? spec.columns : [...spec.keys,...spec.fields,...(name === 'players' ? ['area','channel','arena_match_id','realtime_scope_version'] : ['spawn_round'])];
      const before = pick(e.base, fields), after = pick(e.current, fields);
      combat.push({name,id,e,generation:e.generation,after});
      deltas.push({table:name,keys:e.keys,before,after});
    }
    return {positions,combat,deltas,started:performance.now()};
  }
  failed(frame) {
    for (const {id,e} of frame.positions) if (this.positions.entries.get(id) === e && !this.positions.pendingWrites.has(id)) this.positions.pendingWrites.set(id,{entry:e,generation:e.generation,at:e.dirtyAt??Date.now()});
  }
  acknowledged(frame, changed = []) {
    const p = this.positions, c = this.combat;
    const stagedPosition = new Map(frame.positions.map(entry => [entry.id,entry]));
    const stagedCombat = new Map(frame.combat.map(entry => [identity(entry.name,entry.e.keys),entry]));
    const changes = new Map(changed.map(row => [identity(row.table,row.keys),row]));
    for (const {id} of frame.positions) changes.set(identity('players',[id]),{table:'players',keys:[id]});
    for (const {name,e} of frame.combat) changes.set(identity(name,e.keys),{table:name,keys:e.keys});
    // This cache is returned only to the synchronous post-ACK notification.
    // Values are full durable rows, never the next uncommitted memory overlay.
    const committedRows = ackRowReuseR11 ? new Map() : undefined;
    const combatChanged = [];
    for (const {table,keys} of changes.values()) {
      const id = keys.join('\u001f');
      const t = c.tables.get(table);
      const durableRow = committedRows && t ? t.read.get(...keys)??null : undefined;
      if (committedRows && t) committedRows.set(identity(table,keys),durableRow);
      if (table === 'players') {
        const row = committedRows && t ? pick(durableRow,positionFields) : p.read.get(keys[0]), e = p.entries.get(keys[0]), sent = stagedPosition.get(keys[0]);
        if (row) {
          // Preserve the next position generation only when this was exactly
          // our checkpoint. Teleport/death/scope transitions always win.
          if (sent && e === sent.e && positionFields.every(f => row[f] === sent.after[f])) {
            e.base = {...row}; e.writtenGeneration = sent.generation;
            e.pending = (e.pending??[]).filter(([g]) => g > sent.generation);
            if (e.generation === sent.generation) { p.dirty.delete(keys[0]); delete e.dirtyAt; }
            else e.dirtyAt = e.pending[0]?.[1]??Date.now();
          } else if (!e || positionFields.some(f => row[f] !== e.base[f])) {
            p.entries.set(keys[0],{base:{...row},current:{...row},generation:0,writtenGeneration:0,scopeChangedAt:Date.now()});
            p.pendingWrites.delete(keys[0]); p.dirty.delete(keys[0]);
          }
        } else { p.entries.delete(keys[0]); p.dirty.delete(keys[0]); p.pendingWrites.delete(keys[0]); }
        p.recent.add(keys[0]); p.version++;
      }
      if (!t) continue;
      const e = t.records.get(id), row = committedRows ? durableRow : t.read.get(...keys)??null, sent = stagedCombat.get(identity(table,keys));
      const previousCurrent = e?.current;
      const fields = t.spec.fields;
      if (sent && e === sent.e && (row === null && sent.after === null || row && sent.after && fields.every(f => row[f] === sent.after[f]) && (table !== 'players' || ['area','channel','arena_match_id','realtime_scope_version'].every(f => row[f] === sent.after[f])) && (table !== 'monsters' || row.spawn_round === sent.after.spawn_round))) {
        e.base = row; e.written = sent.generation;
        e.pending = (e.pending??[]).filter(([g]) => g > sent.generation);
        if (e.generation === sent.generation) { c.dirty.delete(table+'\u001e'+id); delete e.dirtyAt; }
        else { e.dirtyAt = e.pending[0]?.[1]??Date.now(); c.dirty.refresh?.(table+'\u001e'+id); }
        // Non-memory columns may have changed in the same durable operation.
        if (row && e.current) e.current = {...row,...pick(e.current,fields)};
        e.version = ++c.serial; e.changedAt = Date.now();
      } else if(!sent&&e?.current&&e.generation!==e.written&&row&&fields.every(f=>row[f]===e.base?.[f])&&(table!=='players'||['area','channel','arena_match_id','realtime_scope_version'].every(f=>row[f]===e.base?.[f]))&&(table!=='monsters'||row.spawn_round===e.base?.spawn_round)){
        // A separately committed inventory/appearance change must not erase
        // HP or cooldown changes accumulated since the last checkpoint.
        e.base=row;e.current={...row,...pick(e.current,fields)};e.version=++c.serial;e.changedAt=Date.now();
      } else {
        t.records.set(id,{base:row,current:row,keys,generation:0,written:0,changedAt:Date.now(),version:++c.serial});
        c.dirty.delete(table+'\u001e'+id);
      }
      const current = t.records.get(id)?.current;
      // The in-memory SQLite mirror already contains previousCurrent. Only
      // identical complete rows can skip its redundant INSERT OR REPLACE.
      // Actual deletes and any transaction/touch observer keep the old path.
      const sameMemoryRow = ackMemoryNoopR11 && current && previousCurrent &&
        !c.memory.isTransaction && !c.touched &&
        t.spec.columns.every(f => current[f] === previousCurrent[f]);
      if (current) { if (!sameMemoryRow) t.put.run(...t.spec.columns.map(f => current[f])); }
      else t.remove.run(...keys);
      if (table === 'monster_participants') c.indexPending(id,t.records.get(id));
      t.recent.add(id); combatChanged.push({name:table,id});
      c.worldLoop?.changed(table,keys[0],current);
    }
    c.publish(combatChanged);
    for (const [store, entries] of [[p,frame.positions],[c,frame.combat]]) if (entries.length) {
      const ms = performance.now()-frame.started;
      store.stats.flushes++; store.stats.lastFlushMs=ms; store.stats.maxFlushMs=Math.max(store.stats.maxFlushMs,ms);
    }
    return committedRows;
  }
}

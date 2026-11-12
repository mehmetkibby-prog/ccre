export type VisibilityRow = { playerId: string; invisible: boolean | number; visibilityRevision: number };
type PlayerVisibility = { id: string; is_gm?: number; gm_invisible?: number; gm_visibility_revision?: number };

// Monotonic markers are shared by HTTP snapshots and the live transport. A
// delayed snapshot cannot resurrect an avatar after its concealment marker.
export class GmVisibilityLedger {
  private hiddenCount = 0;
  get hasHidden() { return this.hiddenCount > 0; }
  private states = new Map<string, { invisible: boolean; revision: number }>();
  accept(rows: readonly VisibilityRow[] = []) {
    const changed: string[] = [];
    for (const row of rows) {
      if (!row || typeof row.playerId !== 'string' || !Number.isSafeInteger(row.visibilityRevision) || row.visibilityRevision < 1) continue;
      const previous = this.states.get(row.playerId);
      if (previous && previous.revision >= row.visibilityRevision) continue;
      const invisible = row.invisible === true || row.invisible === 1;
      this.hiddenCount += Number(invisible) - Number(previous?.invisible === true);
      this.states.set(row.playerId, { invisible, revision: row.visibilityRevision });
      changed.push(row.playerId);
    }
    return changed;
  }
  hidden(id: string) { return this.states.get(id)?.invisible === true; }
  project<T extends PlayerVisibility>(players: T[], viewerId: string): T[] {
    const visible: T[] = [];
    for (const player of players) {
      this.accept([{ playerId: player.id, invisible: player.is_gm === 1 && player.gm_invisible === 1, visibilityRevision: player.gm_visibility_revision ?? 0 }]);
      if (player.id !== viewerId && this.hidden(player.id)) continue;
      const state = this.states.get(player.id);
      visible.push(state && state.revision > (player.gm_visibility_revision ?? 0)
        ? { ...player, gm_invisible: state.invisible ? 1 : 0, gm_visibility_revision: state.revision } : player);
    }
    return visible;
  }
}

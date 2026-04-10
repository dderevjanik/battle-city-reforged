import { state } from './state';

export function pushHistory(): void {
  state.history = state.history.slice(0, state.histIdx + 1);
  state.history.push({
    grid:         new Uint8Array(state.grid),
    playerSpawns: structuredClone(state.playerSpawns),
    enemySpawns:  structuredClone(state.enemySpawns),
    basePositions: structuredClone(state.basePositions),
  });
  state.histIdx = state.history.length - 1;

  if (state.history.length > 80) {
    state.history.shift();
    state.histIdx--;
  }
}

/** Restore state from the snapshot at histIdx. Caller must re-render and refresh UI. */
export function restoreCurrentSnapshot(): void {
  const snap       = state.history[state.histIdx];
  state.grid       = new Uint8Array(snap.grid);
  state.playerSpawns = structuredClone(snap.playerSpawns);
  state.enemySpawns  = structuredClone(snap.enemySpawns);
  state.basePositions = structuredClone(snap.basePositions);
}

export function canUndo(): boolean { return state.histIdx > 0; }
export function canRedo(): boolean { return state.histIdx < state.history.length - 1; }

export function stepUndo(): void { if (canUndo()) { state.histIdx--; restoreCurrentSnapshot(); } }
export function stepRedo(): void { if (canRedo()) { state.histIdx++; restoreCurrentSnapshot(); } }

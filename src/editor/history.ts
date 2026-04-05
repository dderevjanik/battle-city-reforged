import { state } from './state';
import type { SpawnPoint } from './types';

export function pushHistory(): void {
  state.history = state.history.slice(0, state.histIdx + 1);
  state.history.push({
    grid:         new Uint8Array(state.grid),
    playerSpawns: JSON.parse(JSON.stringify(state.playerSpawns)) as SpawnPoint[],
    enemySpawns:  JSON.parse(JSON.stringify(state.enemySpawns))  as SpawnPoint[],
    basePos:      { ...state.basePos },
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
  state.playerSpawns = JSON.parse(JSON.stringify(snap.playerSpawns)) as SpawnPoint[];
  state.enemySpawns  = JSON.parse(JSON.stringify(snap.enemySpawns))  as SpawnPoint[];
  state.basePos      = { ...snap.basePos };
}

export function canUndo(): boolean { return state.histIdx > 0; }
export function canRedo(): boolean { return state.histIdx < state.history.length - 1; }

export function stepUndo(): void { if (canUndo()) { state.histIdx--; restoreCurrentSnapshot(); } }
export function stepRedo(): void { if (canRedo()) { state.histIdx++; restoreCurrentSnapshot(); } }

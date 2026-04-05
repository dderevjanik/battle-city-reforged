import { GW, GH, DEF_PLAYER, DEF_ENEMY } from './constants';
import type { EditorMode, EnemyEntry, HistorySnapshot, SpawnPoint } from './types';

export const state = {
  grid:         new Uint8Array(GW * GH),  // 0 = empty, 1-5 = terrain type index
  mode:         'terrain' as EditorMode,
  brushIdx:     0,

  zoom:         1.0,
  panX:         0,
  panY:         0,
  showGrid:     true,

  isDrawing:    false,
  isErasing:    false,
  isPanning:    false,
  spaceDown:    false,

  panAnchorX:   0,
  panAnchorY:   0,
  panAnchorPX:  0,
  panAnchorPY:  0,

  mouseWX:      0,
  mouseWY:      0,

  playerSpawns: DEF_PLAYER.map((s): SpawnPoint => ({ ...s })),
  enemySpawns:  DEF_ENEMY.map( (s): SpawnPoint => ({ ...s })),
  enemyList:    Array.from<unknown, EnemyEntry>({ length: 20 }, () => ({ type: 'basic', ai: 'classic', drop: '' })),

  history:  [] as HistorySnapshot[],
  histIdx:  -1,
};

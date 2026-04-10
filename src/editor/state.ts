import { GW, GH, DEF_PLAYER, DEF_ENEMY, DEF_BASES } from './constants';
import type { EditorMode, EnemyEntry, HistorySnapshot, SpawnPoint } from './types';

interface EditorState {
  grid: Uint8Array;
  mode: EditorMode;
  brushIdx: number;
  zoom: number;
  panX: number;
  panY: number;
  showGrid: boolean;
  isDrawing: boolean;
  isErasing: boolean;
  isPanning: boolean;
  spaceDown: boolean;
  panAnchorX: number;
  panAnchorY: number;
  panAnchorPX: number;
  panAnchorPY: number;
  mouseWX: number;
  mouseWY: number;
  playerSpawns: SpawnPoint[];
  enemySpawns: SpawnPoint[];
  basePositions: SpawnPoint[];
  enemyList: EnemyEntry[];
  history: HistorySnapshot[];
  histIdx: number;
}

export const state: EditorState = {
  grid:         new Uint8Array(GW * GH),
  mode:         'terrain',
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

  playerSpawns: DEF_PLAYER.map((s) => ({ ...s })),
  enemySpawns:  DEF_ENEMY.map((s) => ({ ...s })),
  basePositions: DEF_BASES.map((s) => ({ ...s })),
  enemyList:    Array.from({ length: 20 }, () => ({ type: 'basic', ai: 'classic', drop: '' })),

  history:  [],
  histIdx:  -1,
};

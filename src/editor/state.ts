import {
  DEFAULT_FIELD_SIZE,
  TS,
  defaultPlayerSpawns,
  defaultEnemySpawns,
  defaultBases,
} from './constants';
import type { EditorMode, EnemyEntry, HistorySnapshot, PaintTool, SpawnPoint, ViewMode } from './types';

interface EditorState {
  fieldWidth: number;
  fieldHeight: number;
  gw: number;
  gh: number;
  viewMode: ViewMode;

  grid: Uint8Array;
  mode: EditorMode;
  paintTool: PaintTool;
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
  lastPaintCol: number;
  lastPaintRow: number;
  paintAnchorCX: number;
  paintAnchorCY: number;
  paintHasDragged: boolean;
  dragStartCol: number;
  dragStartRow: number;
  playerSpawns: SpawnPoint[];
  enemySpawns: SpawnPoint[];
  basePositions: SpawnPoint[];
  enemyList: EnemyEntry[];
  history: HistorySnapshot[];
  histIdx: number;
}

const initFieldWidth = DEFAULT_FIELD_SIZE;
const initFieldHeight = DEFAULT_FIELD_SIZE;

export const state: EditorState = {
  fieldWidth:   initFieldWidth,
  fieldHeight:  initFieldHeight,
  gw:           initFieldWidth / TS,
  gh:           initFieldHeight / TS,
  viewMode:     'fit',

  grid:         new Uint8Array((initFieldWidth / TS) * (initFieldHeight / TS)),
  mode:         'terrain',
  paintTool:    'free',
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

  lastPaintCol: -1,
  lastPaintRow: -1,
  paintAnchorCX: 0,
  paintAnchorCY: 0,
  paintHasDragged: false,
  dragStartCol: 0,
  dragStartRow: 0,

  playerSpawns: defaultPlayerSpawns(initFieldWidth, initFieldHeight),
  enemySpawns:  defaultEnemySpawns(initFieldWidth, initFieldHeight),
  basePositions: defaultBases(initFieldWidth, initFieldHeight),
  enemyList:    Array.from({ length: 20 }, () => ({ type: 'basic', ai: 'classic', drop: '' })),

  history:  [],
  histIdx:  -1,
};

/**
 * Resize the field. Existing grid content is preserved top-left aligned;
 * cells outside the new bounds are dropped, as are spawn/base positions
 * that would land outside.
 */
export function resizeField(newWidth: number, newHeight: number): void {
  const newGw = Math.max(1, Math.round(newWidth / TS));
  const newGh = Math.max(1, Math.round(newHeight / TS));
  const newGrid = new Uint8Array(newGw * newGh);
  const copyGw = Math.min(state.gw, newGw);
  const copyGh = Math.min(state.gh, newGh);
  for (let r = 0; r < copyGh; r++) {
    for (let c = 0; c < copyGw; c++) {
      newGrid[r * newGw + c] = state.grid[r * state.gw + c];
    }
  }
  state.grid = newGrid;
  state.fieldWidth = newGw * TS;
  state.fieldHeight = newGh * TS;
  state.gw = newGw;
  state.gh = newGh;

  const inBounds = (s: SpawnPoint): boolean =>
    s.x >= 0 && s.x < state.fieldWidth && s.y >= 0 && s.y < state.fieldHeight;
  state.playerSpawns = state.playerSpawns.filter(inBounds);
  state.enemySpawns = state.enemySpawns.filter(inBounds);
  state.basePositions = state.basePositions.filter(inBounds);
}

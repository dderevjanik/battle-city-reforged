import type { Brush, SpawnPoint, SpriteRect } from './types';

export const TS    = 16;          // smallest tile (brick)
export const TM    = 32;          // medium tile (steel, water, …)
export const TL    = 64;          // large tile = tank size

// Default map size = 13×13 tank-tiles (832×832), matching the play viewport.
// Maps may be larger (or smaller) — see state.fieldWidth/fieldHeight.
export const DEFAULT_FIELD_TILES = 13;
export const DEFAULT_FIELD_SIZE  = DEFAULT_FIELD_TILES * TL;
export const MIN_FIELD_TILES = 8;
export const MAX_FIELD_TILES = 32;

export const COLORS: Record<string, string> = {
  brick:  '#7c3d1a',
  steel:  '#5a6672',
  jungle: '#1b5e20',
  water:  '#0d47a1',
  ice:    '#7fd4e0',
};

// Minimum snap size when painting each terrain type
export const SNAP: Record<string, number> = {
  brick:  TS,
  steel:  TM,
  jungle: TM,
  water:  TM,
  ice:    TM,
};

export const BRUSHES: Brush[] = [
  { type: 'brick',  size: 16 },
  { type: 'brick',  size: 32 },
  { type: 'brick',  size: 64 },
  { type: 'steel',  size: 32 },
  { type: 'steel',  size: 64 },
  { type: 'jungle', size: 32 },
  { type: 'jungle', size: 64 },
  { type: 'water',  size: 32 },
  { type: 'water',  size: 64 },
  { type: 'ice',    size: 32 },
  { type: 'ice',    size: 64 },
  { type: null,     size: 32 },  // eraser
];

export const T2I: Record<string, number> = {
  '': 0, brick: 1, steel: 2, jungle: 3, water: 4, ice: 5,
};
export const I2T: string[] = ['', 'brick', 'steel', 'jungle', 'water', 'ice'];

// Served at root by webpack-dev-server (data/ is copied to dist/data/)
export const SPRITE_SRC = 'data/graphics/sprite.png';

export const SRECTS: Record<string, SpriteRect> = {
  brick:      [1052,   0, 16, 16],
  brick2:     [1068,   0, 16, 16],
  steel:      [1052,  64, 32, 32],
  jungle:     [1116, 128, 32, 32],
  water:      [1052, 192, 32, 32],
  water2:     [1116, 192, 32, 32],
  ice:        [1180, 128, 32, 32],
  base:       [1244, 128, 64, 64],
  enemyTank:  [524,  264, 52, 60],  // enemy default basic up.1
};

// Player tank sprites by player index (P1..P4)
export const PLAYER_TANK_RECTS: SpriteRect[] = [
  [  4,   8, 52, 52],  // P1 primary
  [  4, 532, 52, 52],  // P2 secondary
  [524,   8, 52, 52],  // P3 default
  [524, 532, 52, 52],  // P4 danger
];

// Enemy tank sprites by kind (default palette, up.1 frame)
export const ENEMY_TANK_RECTS: Record<string, SpriteRect> = {
  basic:  [524, 264, 52, 60],
  fast:   [524, 328, 52, 60],
  medium: [524, 396, 52, 60],
  heavy:  [524, 460, 52, 60],
};

// Enemy tank sprites with a power-up drop (danger/purple variant, up.1 frame)
export const ENEMY_TANK_DROP_RECTS: Record<string, SpriteRect> = {
  basic:  [524, 788, 52, 60],
  fast:   [524, 852, 52, 60],
  medium: [524, 920, 52, 60],
  heavy:  [524, 984, 52, 60],
};

export function defaultPlayerSpawns(width: number, height: number): SpawnPoint[] {
  const y = height - TL;
  const snap = (v: number): number => Math.round(v / TL) * TL;
  return [
    { x: snap(width * 0.25), y },
    { x: snap(width * 0.5),  y },
  ];
}

export function defaultEnemySpawns(width: number, _height: number): SpawnPoint[] {
  const snap = (v: number): number => Math.round(v / TL) * TL;
  return [
    { x: 0, y: 0 },
    { x: snap(width * 0.5), y: 0 },
    { x: width - TL, y: 0 },
  ];
}

export function defaultBases(width: number, height: number): SpawnPoint[] {
  const snap = (v: number): number => Math.round(v / TL) * TL;
  return [{ x: snap(width * 0.5), y: height - TL }];
}

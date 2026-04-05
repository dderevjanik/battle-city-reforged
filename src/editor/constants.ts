import type { Brush, SpawnPoint, SpriteRect } from './types';

export const FIELD = 832;
export const TS    = 16;          // smallest tile (brick)
export const TM    = 32;          // medium tile (steel, water, …)
export const TL    = 64;          // large tile = tank size
export const GW    = FIELD / TS;  // grid columns = 52
export const GH    = FIELD / TS;  // grid rows    = 52

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
  steel:      [1052,  64, 32, 32],
  jungle:     [1116, 128, 32, 32],
  water:      [1052, 192, 32, 32],
  ice:        [1180, 128, 32, 32],
  base:       [1244, 128, 64, 64],
  playerTank: [4,      8, 52, 52],  // player primary basic up.1
  enemyTank:  [524,  264, 52, 60],  // enemy default basic up.1
};

export const DEF_PLAYER: SpawnPoint[] = [{ x: 256, y: 768 }, { x: 512, y: 768 }];
export const DEF_ENEMY:  SpawnPoint[] = [{ x: 0, y: 0 }, { x: 384, y: 0 }, { x: 768, y: 0 }];
export const BASE_POS:   SpawnPoint   = { x: 384, y: 768 };

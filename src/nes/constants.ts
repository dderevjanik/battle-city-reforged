// Battle City (Famicom / J) ROM offsets and tile encoding.
// Source: docs/battle-city-extractor.md (verified against Quarrel/BattleCityJ.ini).
//
// All offsets are absolute file offsets — the 16-byte iNES header is INCLUDED.
// This module targets the original Japanese ROM (NROM-128, 16K PRG, 8K CHR).
// Format-compatible hacks that keep the same data layout will work.

import { TankKind } from '../tank/TankTypes';
import { TerrainType } from '../terrain/TerrainType';

export const INES_HEADER_SIZE = 16;
export const ROM_FILE_SIZE = 24592;

export const LEVEL_BASE = 0x308a;
export const STAGE_LEN = 91;
export const STAGE_COUNT = 36;
export const PLAYABLE_COUNT = 35;

export const SPAWN_BASE = 0x2484;
export const ENEMY_DATA_BASE = 0x24fc;
export const ENEMY_COUNT_BASE = 0x2588;

export const NES_GRID = 13;
export const NES_BLOCK_PX = 16;
export const NES_DISPLAY_SCALE = 4;

// Eagle base position is fixed in the NES game.
export const BASE_BLOCK_X = 6;
export const BASE_BLOCK_Y = 12;

// Quadrant mask bits within a 16x16 NES block. Each bit marks one 8x8 quadrant.
export const Q_TL = 0b1000;
export const Q_TR = 0b0100;
export const Q_BL = 0b0010;
export const Q_BR = 0b0001;
export const Q_ALL = Q_TL | Q_TR | Q_BL | Q_BR;

export interface BlockPattern {
  terrain: TerrainType | null;
  mask: number;
}

// Nibble (0x0..0xF) → (terrain, quadrant mask).
//
// Derived directly from the ROM's TSA table at 0x1ADB (16 entries × 4 CHR tile
// IDs in TL/TR/BL/BR order), which is authoritative. Each nibble's terrain is
// inferred from which CHR tile fills its quadrants:
//   0x00 / 0x20 = empty/background, 0x0F = brick, 0x10 = steel,
//   0x12 = water, 0x22 = trees/jungle, 0x21 = ice.
//
// Note: the spec doc's §3.5 convention table is shifted relative to the real
// table — e.g. 0x4 is full brick (not left-half), 0x1 is bottom-half (not full).
// We use the empirically-correct mapping here.
export const BLOCK_PATTERNS: readonly BlockPattern[] = [
  /* 0x0 brick right     */ { terrain: TerrainType.Brick,  mask: Q_TR | Q_BR },
  /* 0x1 brick bottom    */ { terrain: TerrainType.Brick,  mask: Q_BL | Q_BR },
  /* 0x2 brick left      */ { terrain: TerrainType.Brick,  mask: Q_TL | Q_BL },
  /* 0x3 brick top       */ { terrain: TerrainType.Brick,  mask: Q_TL | Q_TR },
  /* 0x4 brick full      */ { terrain: TerrainType.Brick,  mask: Q_ALL },
  /* 0x5 steel right     */ { terrain: TerrainType.Steel,  mask: Q_TR | Q_BR },
  /* 0x6 steel bottom    */ { terrain: TerrainType.Steel,  mask: Q_BL | Q_BR },
  /* 0x7 steel left      */ { terrain: TerrainType.Steel,  mask: Q_TL | Q_BL },
  /* 0x8 steel top       */ { terrain: TerrainType.Steel,  mask: Q_TL | Q_TR },
  /* 0x9 steel full      */ { terrain: TerrainType.Steel,  mask: Q_ALL },
  /* 0xA water           */ { terrain: TerrainType.Water,  mask: Q_ALL },
  /* 0xB jungle / trees  */ { terrain: TerrainType.Jungle, mask: Q_ALL },
  /* 0xC ice             */ { terrain: TerrainType.Ice,    mask: Q_ALL },
  /* 0xD empty (bg)      */ { terrain: null,               mask: 0 },
  /* 0xE unused / empty  */ { terrain: null,               mask: 0 },
  /* 0xF unused / empty  */ { terrain: null,               mask: 0 },
];

// NES enemy class (bits 7..5 of the data byte). The original ROM uses values
// 4..7 only — values 0..3 do not appear in canonical stage data. For example
// stage 0 has slot 0 = 0x80 (type 4 = basic) and slot 1 = 0xA0 (type 5 = fast).
export const NES_ENEMY_TYPE_MAP: Record<number, TankKind> = {
  4: TankKind.Basic,
  5: TankKind.Fast,
  6: TankKind.Medium,
  7: TankKind.Heavy,
};

// Battle City spawns one drop-carrying enemy at fixed convoy indices —
// engine logic, not data. The 4th/11th/18th tank (0-based: 3/10/17).
export const DROP_INDICES: readonly number[] = [3, 10, 17];

import { gridToRegionsPure } from '../editor/grid';
import type { MapDto } from '../map/MapDto';
import { TankAiMode } from '../tank/TankAiMode';
import { TankKind } from '../tank/TankTypes';
import { TerrainType } from '../terrain/TerrainType';
import { TilesetId } from '../terrain/TilesetId';
import { EDITOR_TERRAIN_TYPES } from '../share/mapEnums';

import {
  BASE_BLOCK_X,
  BASE_BLOCK_Y,
  BLOCK_PATTERNS,
  DROP_INDICES,
  NES_BLOCK_PX,
  NES_DISPLAY_SCALE,
  NES_ENEMY_TYPE_MAP,
  NES_GRID,
  Q_BL,
  Q_BR,
  Q_TL,
  Q_TR,
} from './constants';
import { extractEnemyConvoy } from './extractEnemies';
import { extractSharedSpawns } from './extractSpawns';
import { extractStage } from './extractStage';
import type { NesRom } from './parseRom';

const TS = 16;
const TL = NES_BLOCK_PX * NES_DISPLAY_SCALE; // 64
const FIELD_PX = NES_GRID * TL; // 832
const GRID_W = FIELD_PX / TS; // 52

// TerrainType → editor terrain index (matches src/share/mapEnums.ts).
const TERRAIN_INDEX: Record<string, number> = Object.fromEntries(
  EDITOR_TERRAIN_TYPES.map((t, i) => [t, i]),
);

// Each NES block spans 4×4 TS cells. A quadrant covers a 2×2 TS-cell sub-patch.
const QUADRANT_PATCHES: ReadonlyArray<readonly [number, readonly [number, number]]> = [
  [Q_TL, [0, 0]],
  [Q_TR, [2, 0]],
  [Q_BL, [0, 2]],
  [Q_BR, [2, 2]],
];

/**
 * Clears the 4×4 TS-cell tank footprint at a given display-pixel position.
 * Used to make sure ROM-placed terrain never blocks a base / player spawn /
 * enemy spawn — those positions need to be physically traversable for the
 * eagle to render and for tanks to spawn without being trapped or
 * shielded against bullets.
 */
function clearTankFootprint(grid: Uint8Array, displayX: number, displayY: number): void {
  const col0 = Math.floor(displayX / TS);
  const row0 = Math.floor(displayY / TS);
  for (let r = row0; r < row0 + 4; r++) {
    for (let c = col0; c < col0 + 4; c++) {
      if (c < 0 || c >= GRID_W || r < 0 || r >= GRID_W) continue;
      grid[r * GRID_W + c] = 0;
    }
  }
}

/**
 * Paints the eagle's brick surround (top wall + side wings) into `grid` —
 * only into cells that are currently empty, so ROM terrain placed on top of
 * the base (steel, jungle, water, ice, …) overrides it.
 *
 * Geometry mirrors editor's paintBaseDefense (io.ts).
 */
function paintBaseDefense(grid: Uint8Array): void {
  const brickIdx = TERRAIN_INDEX[TerrainType.Brick] ?? 0;
  if (!brickIdx) return;
  const heartCol = (BASE_BLOCK_X * TL) / TS;
  const heartRow = (BASE_BLOCK_Y * TL) / TS;
  const fillIfEmpty = (col: number, row: number, cols: number, rows: number): void => {
    for (let r = row; r < row + rows; r++) {
      for (let c = col; c < col + cols; c++) {
        if (c < 0 || c >= GRID_W || r < 0 || r >= GRID_W) continue;
        if (grid[r * GRID_W + c] === 0) grid[r * GRID_W + c] = brickIdx;
      }
    }
  };
  fillIfEmpty(heartCol - 2, heartRow - 2, 8, 2); // top wall
  fillIfEmpty(heartCol - 2, heartRow,     2, 4); // left wing
  fillIfEmpty(heartCol + 4, heartRow,     2, 4); // right wing
}

export interface StageToMapDtoOptions {
  title?: string;
}

export function stageToMapDto(
  rom: NesRom,
  idx: number,
  opts: StageToMapDtoOptions = {},
): MapDto {
  const stage = extractStage(rom, idx);
  const grid = new Uint8Array(GRID_W * GRID_W);

  for (let by = 0; by < NES_GRID; by++) {
    for (let bx = 0; bx < NES_GRID; bx++) {
      const nibble = stage.blocks[by * NES_GRID + bx];
      const pattern = BLOCK_PATTERNS[nibble];
      if (!pattern.terrain || pattern.mask === 0) continue;
      const terrainIdx = TERRAIN_INDEX[pattern.terrain] ?? 0;
      if (!terrainIdx) continue;
      const baseCol = bx * 4;
      const baseRow = by * 4;
      for (const [bit, [qx, qy]] of QUADRANT_PATCHES) {
        if ((pattern.mask & bit) === 0) continue;
        for (let r = 0; r < 2; r++) {
          for (let c = 0; c < 2; c++) {
            grid[(baseRow + qy + r) * GRID_W + (baseCol + qx + c)] = terrainIdx;
          }
        }
      }
    }
  }

  const spawns = extractSharedSpawns(rom);
  const convoy = extractEnemyConvoy(rom, idx);

  // Clear terrain on top of the eagle, player spawns, and enemy spawns.
  // Some hacks (e.g. Random City) place steel/water/brick over these positions,
  // which would block the eagle base from being rendered or trap tanks behind
  // bullet-proof walls. The engine itself treats these cells as traversable.
  clearTankFootprint(grid, BASE_BLOCK_X * TL, BASE_BLOCK_Y * TL);
  for (const p of spawns.playerSpawns) clearTankFootprint(grid, p.x, p.y);
  for (const p of spawns.enemySpawns)  clearTankFootprint(grid, p.x, p.y);

  // Paint the original Battle City eagle-base brick surround. Only fill cells
  // the ROM left empty — ROM-defined terrain that survived the spawn-clear
  // step still wins.
  paintBaseDefense(grid);

  const regions = gridToRegionsPure(grid, GRID_W, GRID_W, TS);

  const enemyList: { type: TankKind; ai: TankAiMode; drop?: 'random' }[] = [];
  for (const slot of convoy.slots) {
    const kind = NES_ENEMY_TYPE_MAP[slot.type];
    if (kind === undefined) {
      // eslint-disable-next-line no-console
      console.warn(`[nes] stage ${idx}: unknown enemy type ${slot.type} → falling back to basic`);
    }
    for (let i = 0; i < slot.count; i++) {
      enemyList.push({ type: kind ?? TankKind.Basic, ai: TankAiMode.Classic });
    }
  }
  for (const dropIdx of DROP_INDICES) {
    if (enemyList[dropIdx]) enemyList[dropIdx].drop = 'random';
  }

  const dto: MapDto = {
    tileset: TilesetId.Classic,
    title: opts.title ?? `STAGE ${idx + 1}`,
    width: FIELD_PX,
    height: FIELD_PX,
    spawn: {
      enemy: {
        spawnDelay: 3,
        maxAliveCount: 4,
        list: enemyList,
        locations: spawns.enemySpawns.map((p) => ({ x: p.x, y: p.y })),
      },
      player: {
        locations: spawns.playerSpawns.map((p) => ({ x: p.x, y: p.y })),
      },
      bases: [{ x: BASE_BLOCK_X * TL, y: BASE_BLOCK_Y * TL }],
    },
    terrain: {
      regions: regions.map((r) => ({
        type: r.type as TerrainType,
        x: r.x,
        y: r.y,
        width: r.width,
        height: r.height,
      })),
    },
  };

  return dto;
}

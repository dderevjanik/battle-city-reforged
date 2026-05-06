import { NES_BLOCK_PX, NES_DISPLAY_SCALE, SPAWN_BASE } from './constants';
import type { NesRom } from './parseRom';

export interface NesPoint {
  x: number;
  y: number;
}

export interface NesSpawns {
  /** 3 enemy spawn points (left, middle, right) in editor display pixels. */
  enemySpawns: [NesPoint, NesPoint, NesPoint];
  /** 2 player spawn points (P1, P2) in editor display pixels. */
  playerSpawns: [NesPoint, NesPoint];
}

/**
 * Spawn positions are shared across all stages — stored as raw NES pixel
 * coordinates. Per spec §4.1, `block = (raw >> 4) - 1`. We then scale to the
 * editor's 832×832 display field.
 */
export function extractSharedSpawns(rom: NesRom): NesSpawns {
  const blockToPx = (raw: number): number =>
    Math.max(0, ((raw >> 4) - 1)) * NES_BLOCK_PX * NES_DISPLAY_SCALE;

  const enemyXs = [rom.bytes[SPAWN_BASE + 0], rom.bytes[SPAWN_BASE + 1], rom.bytes[SPAWN_BASE + 2]];
  const enemyYs = [rom.bytes[SPAWN_BASE + 3], rom.bytes[SPAWN_BASE + 4], rom.bytes[SPAWN_BASE + 5]];
  const playerXs = [rom.bytes[SPAWN_BASE + 6], rom.bytes[SPAWN_BASE + 7]];
  const playerYs = [rom.bytes[SPAWN_BASE + 8], rom.bytes[SPAWN_BASE + 9]];

  return {
    enemySpawns: [
      { x: blockToPx(enemyXs[0]), y: blockToPx(enemyYs[0]) },
      { x: blockToPx(enemyXs[1]), y: blockToPx(enemyYs[1]) },
      { x: blockToPx(enemyXs[2]), y: blockToPx(enemyYs[2]) },
    ],
    playerSpawns: [
      { x: blockToPx(playerXs[0]), y: blockToPx(playerYs[0]) },
      { x: blockToPx(playerXs[1]), y: blockToPx(playerYs[1]) },
    ],
  };
}

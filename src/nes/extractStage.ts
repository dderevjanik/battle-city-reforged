import { LEVEL_BASE, NES_GRID, STAGE_COUNT, STAGE_LEN } from './constants';
import type { NesRom } from './parseRom';

export interface NesStage {
  index: number;
  /** 13×13 nibbles, row-major (length 169). */
  blocks: Uint8Array;
}

/**
 * Reads the 91 packed bytes for stage `idx` and unpacks them into a 13×13
 * row-major nibble array (high nibble first per spec §3.4).
 */
export function extractStage(rom: NesRom, idx: number): NesStage {
  if (idx < 0 || idx >= STAGE_COUNT) {
    throw new RangeError(`Stage index ${idx} out of range [0, ${STAGE_COUNT})`);
  }
  const base = LEVEL_BASE + idx * STAGE_LEN;
  const blocks = new Uint8Array(NES_GRID * NES_GRID);
  for (let y = 0; y < NES_GRID; y++) {
    const rowBase = base + y * 7;
    for (let x = 0; x < NES_GRID; x++) {
      const b = rom.bytes[rowBase + (x >> 1)];
      const nibble = (x & 1) === 0 ? (b >> 4) & 0x0f : b & 0x0f;
      blocks[y * NES_GRID + x] = nibble;
    }
  }
  return { index: idx, blocks };
}

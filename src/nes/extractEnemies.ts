import { ENEMY_COUNT_BASE, ENEMY_DATA_BASE, STAGE_COUNT } from './constants';
import type { NesRom } from './parseRom';

export interface NesEnemySlot {
  /** 0..7, decoded from bits 7..5 of the data byte. */
  type: number;
  /** Bit 2 of the data byte — true if the slot drops a powerup icon. */
  powerup: boolean;
  /** 0..3, decoded from bits 1..0. */
  shield: number;
  /** Number of tanks in this slot (from the parallel count table). */
  count: number;
}

export interface NesConvoy {
  index: number;
  slots: [NesEnemySlot, NesEnemySlot, NesEnemySlot, NesEnemySlot];
}

export function extractEnemyConvoy(rom: NesRom, idx: number): NesConvoy {
  if (idx < 0 || idx >= STAGE_COUNT) {
    throw new RangeError(`Stage index ${idx} out of range [0, ${STAGE_COUNT})`);
  }
  const dataBase = ENEMY_DATA_BASE + idx * 4;
  const countBase = ENEMY_COUNT_BASE + idx * 4;
  const slots = [0, 1, 2, 3].map<NesEnemySlot>((slot) => {
    const byte = rom.bytes[dataBase + slot];
    return {
      type: (byte >> 5) & 0x07,
      powerup: ((byte >> 2) & 0x01) === 1,
      shield: byte & 0x03,
      count: rom.bytes[countBase + slot],
    };
  }) as NesConvoy['slots'];
  return { index: idx, slots };
}

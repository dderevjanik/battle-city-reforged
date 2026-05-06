import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';

import { ROM_FILE_SIZE, LEVEL_BASE, STAGE_LEN, NES_GRID } from './constants';
import { extractStage } from './extractStage';
import { extractEnemyConvoy } from './extractEnemies';
import { extractSharedSpawns } from './extractSpawns';
import { parseRom } from './parseRom';
import { NesHeaderError, validateINes } from './header';
import { stageToMapDto } from './buildMapDto';

function makeRom(): Uint8Array {
  const bytes = new Uint8Array(ROM_FILE_SIZE);
  // iNES header: NES\x1A, PRG=1, CHR=1, flags6=0
  bytes[0] = 0x4e;
  bytes[1] = 0x45;
  bytes[2] = 0x53;
  bytes[3] = 0x1a;
  bytes[4] = 0x01;
  bytes[5] = 0x01;
  return bytes;
}

function packRow(nibbles: number[]): number[] {
  // 13 nibbles → 7 bytes; last 4 bits of byte 6 are padding.
  const out = new Array<number>(7).fill(0);
  for (let x = 0; x < NES_GRID; x++) {
    const byteIdx = x >> 1;
    if ((x & 1) === 0) out[byteIdx] |= (nibbles[x] & 0x0f) << 4;
    else out[byteIdx] |= nibbles[x] & 0x0f;
  }
  return out;
}

describe('validateINes', () => {
  it('accepts a canonical Battle City header', () => {
    const rom = makeRom();
    validateINes(rom);
  });

  it('rejects bad magic', () => {
    const rom = makeRom();
    rom[0] = 0;
    assert.throws(() => validateINes(rom), NesHeaderError);
  });

  it('rejects wrong PRG bank count', () => {
    const rom = makeRom();
    rom[4] = 2;
    assert.throws(() => validateINes(rom), NesHeaderError);
  });

  it('rejects wrong file size', () => {
    const rom = makeRom().slice(0, ROM_FILE_SIZE - 100);
    rom[0] = 0x4e; rom[1] = 0x45; rom[2] = 0x53; rom[3] = 0x1a;
    rom[4] = 1; rom[5] = 1;
    assert.throws(() => validateINes(rom), NesHeaderError);
  });
});

describe('extractStage', () => {
  it('unpacks 13 nibbles per row, high-nibble first', () => {
    const rom = makeRom();
    // Stage 0, row 0: alternating full-brick (4) / full-steel (9).
    const row0 = [4, 9, 4, 9, 4, 9, 4, 9, 4, 9, 4, 9, 4];
    const packed = packRow(row0);
    const base = LEVEL_BASE;
    for (let i = 0; i < 7; i++) rom[base + i] = packed[i];

    const parsed = parseRom(rom);
    const stage = extractStage(parsed, 0);
    for (let x = 0; x < NES_GRID; x++) {
      assert.equal(stage.blocks[x], row0[x], `block at (${x},0) mismatch`);
    }
  });

  it('reads stage offsets at LEVEL_BASE + N*91', () => {
    const rom = makeRom();
    rom[LEVEL_BASE + 1 * STAGE_LEN] = 0xab; // stage 1, row 0, byte 0
    const parsed = parseRom(rom);
    const stage1 = extractStage(parsed, 1);
    assert.equal(stage1.blocks[0], 0x0a);
    assert.equal(stage1.blocks[1], 0x0b);
  });

  it('throws on out-of-range index', () => {
    const rom = makeRom();
    const parsed = parseRom(rom);
    assert.throws(() => extractStage(parsed, 36), RangeError);
    assert.throws(() => extractStage(parsed, -1), RangeError);
  });
});

describe('extractEnemyConvoy', () => {
  it('decodes type/powerup/shield/count bitfields', () => {
    const rom = makeRom();
    // bits: type=5 (101), powerup=1, shield=3 → 0b101_0_0_1_11 = 0xa7
    rom[0x24fc + 0] = 0xa7;
    rom[0x2588 + 0] = 5;
    const parsed = parseRom(rom);
    const convoy = extractEnemyConvoy(parsed, 0);
    assert.equal(convoy.slots[0].type, 5);
    assert.equal(convoy.slots[0].powerup, true);
    assert.equal(convoy.slots[0].shield, 3);
    assert.equal(convoy.slots[0].count, 5);
  });
});

describe('extractSharedSpawns', () => {
  it('converts (raw>>4 - 1) blocks to display pixels', () => {
    const rom = makeRom();
    // Enemy 1 X at NES block 6 → raw = 7<<4 = 0x70 → display 6 * 64 = 384
    rom[0x2484] = 0x70;
    rom[0x2485] = 0xd0; // block 12 → 768
    rom[0x2486] = 0x10; // block 0 → 0
    const parsed = parseRom(rom);
    const spawns = extractSharedSpawns(parsed);
    assert.equal(spawns.enemySpawns[0].x, 384);
    assert.equal(spawns.enemySpawns[1].x, 768);
    assert.equal(spawns.enemySpawns[2].x, 0);
  });
});

describe('stageToMapDto', () => {
  it('emits a valid 832×832 MapDto with merged terrain regions', () => {
    const rom = makeRom();
    // Stage 0 row 0: full-brick at column 0, then empties (0xD).
    const row = [4, 0xd, 0xd, 0xd, 0xd, 0xd, 0xd, 0xd, 0xd, 0xd, 0xd, 0xd, 0xd];
    const packed = packRow(row);
    for (let i = 0; i < 7; i++) rom[LEVEL_BASE + i] = packed[i];
    // Other rows: all empty (0xD)
    for (let y = 1; y < 13; y++) {
      const emptyRow = packRow(new Array(13).fill(0xd));
      for (let i = 0; i < 7; i++) rom[LEVEL_BASE + y * 7 + i] = emptyRow[i];
    }
    // Spawns
    rom[0x2484] = 0x70; rom[0x2485] = 0xd0; rom[0x2486] = 0x10;
    rom[0x2487] = 0x10; rom[0x2488] = 0x10; rom[0x2489] = 0x10;
    rom[0x248a] = 0x50; rom[0x248b] = 0x90; rom[0x248c] = 0xd0; rom[0x248d] = 0xd0;
    // Enemy convoy: 4 basic tanks (NES type 4) in slot 0
    rom[0x24fc + 0] = 0x80; rom[0x2588 + 0] = 4;

    const parsed = parseRom(rom);
    const dto = stageToMapDto(parsed, 0);

    assert.equal(dto.width, 832);
    assert.equal(dto.height, 832);
    assert.equal(dto.tileset, 'classic');
    assert.equal(dto.title, 'STAGE 1');
    assert.equal(dto.spawn.bases?.[0].x, 384);
    assert.equal(dto.spawn.bases?.[0].y, 768);
    assert.equal(dto.spawn.enemy.list?.length, 4);
    assert.equal(dto.spawn.enemy.list?.[0].type, 'basic');
    // The brick block at (0,0) should produce one merged 64×64 region.
    const brick = dto.terrain?.regions?.find((r) => r.type === 'brick');
    assert.ok(brick, 'expected brick region');
    assert.equal(brick.x, 0);
    assert.equal(brick.y, 0);
    assert.equal(brick.width, 64);
    assert.equal(brick.height, 64);
  });

  it('renders a half-brick (right) as a 32×64 region', () => {
    const rom = makeRom();
    // 0x0 = right-half brick; rest are 0xD = empty.
    const row = [0, 0xd, 0xd, 0xd, 0xd, 0xd, 0xd, 0xd, 0xd, 0xd, 0xd, 0xd, 0xd];
    const packed = packRow(row);
    for (let i = 0; i < 7; i++) rom[LEVEL_BASE + i] = packed[i];
    for (let y = 1; y < 13; y++) {
      const emptyRow = packRow(new Array(13).fill(0xd));
      for (let i = 0; i < 7; i++) rom[LEVEL_BASE + y * 7 + i] = emptyRow[i];
    }
    rom[0x2484] = 0x10; rom[0x2485] = 0x10; rom[0x2486] = 0x10;
    rom[0x2487] = 0x10; rom[0x2488] = 0x10; rom[0x2489] = 0x10;
    rom[0x248a] = 0x10; rom[0x248b] = 0x10; rom[0x248c] = 0x10; rom[0x248d] = 0x10;

    const parsed = parseRom(rom);
    const dto = stageToMapDto(parsed, 0);
    const brick = dto.terrain?.regions?.find((r) => r.type === 'brick');
    assert.ok(brick);
    // Right half of block 0: starts at x=32, full 64 height, 32 wide.
    assert.equal(brick.x, 32);
    assert.equal(brick.y, 0);
    assert.equal(brick.width, 32);
    assert.equal(brick.height, 64);
  });
});

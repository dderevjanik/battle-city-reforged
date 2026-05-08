#!/usr/bin/env tsx
// Extract sprite/tile graphics from a Battle City .nes ROM into PNG files.
//
// Usage:
//   tsx scripts/nes-extract-sprites.ts <rom.nes> [--out <dir>]
//
// Default output dir: data/graphics/<rom-basename>/
//
// Outputs (1× native pixel size, RGBA PNG, ROM palettes applied):
//   chr-sprite-pal{0..3}.png    full sprite bank as 8×8 grid of 16×16 quads (128×128)
//   chr-bg-pal{0..3}.png        full BG bank as 16×16 grid of 8×8 tiles (128×128)
//   palettes.png                visual reference of all 8 ROM palettes
//   sprites/pal{P}/q{TL}.png    64 individual 16×16 sprite frames per palette (256 PNGs)
//                               TL is the hex top-left tile ID; tanks live in here
//   terrain/NN_<material>.png   16 blocks (16×16) using authoritative TSA + per-block palette
//   eagle/normal-pal{0..3}.png  eagle base composite (56×32) in each BG palette
//   eagle/fortified-pal{0..3}.png  fortified eagle base (56×32)
//
// Tank, bullet, item, font, and menu glyphs are not auto-categorized — their
// tile-ID groupings live in PRG code, not data tables. Identify them visually
// from chr-sprite-pal*.png (which is laid out as a 16×16 tile grid).

import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { basename, extname, resolve } from 'node:path';
import { deflateSync } from 'node:zlib';

import { parseRom } from '../src/nes/index';

// ── ROM offsets (Battle City J / NROM-128). See docs/battle-city-extractor.md.
const SPRITE_PAL_OFFSET = 0x1565; // 4 palettes × 4 bytes (NES master indices)
const BG_PAL_OFFSET = 0x1585;
const ATTR_TABLE_OFFSET = 0x1acb; // 16 bytes, palette index per block-type
const TSA_OFFSET = 0x1adb;        // 16 entries × 4 CHR tile IDs (TL/TR/BL/BR)
const EAGLE_TSA_OFFSET = 0x137d;  // 4 rows × 7 nametable bytes
const FORTIFIED_TSA_OFFSET = 0x1399;
const CHR_SPRITE_OFFSET = 0x4010; // 4096 bytes = 256 tiles
const CHR_BG_OFFSET = 0x5010;
const TILES_PER_BANK = 256;

// ── NES 2C02 master palette (RGB triples for indices 0x00..0x3F).
// Standard FCEUX-equivalent values; sufficient for static asset extraction.
const NES_MASTER_PALETTE: ReadonlyArray<readonly [number, number, number]> = [
  [84, 84, 84],   [0, 30, 116],   [8, 16, 144],   [48, 0, 136],
  [68, 0, 100],   [92, 0, 48],    [84, 4, 0],     [60, 24, 0],
  [32, 42, 0],    [8, 58, 0],     [0, 64, 0],     [0, 60, 0],
  [0, 50, 60],    [0, 0, 0],      [0, 0, 0],      [0, 0, 0],
  [152, 150, 152],[8, 76, 196],   [48, 50, 236],  [92, 30, 228],
  [136, 20, 176], [160, 20, 100], [152, 34, 32],  [120, 60, 0],
  [84, 90, 0],    [40, 114, 0],   [8, 124, 0],    [0, 118, 40],
  [0, 102, 120],  [0, 0, 0],      [0, 0, 0],      [0, 0, 0],
  [236, 238, 236],[76, 154, 236], [120, 124, 236],[176, 98, 236],
  [228, 84, 236], [236, 88, 180], [236, 106, 100],[212, 136, 32],
  [160, 170, 0],  [116, 196, 0],  [76, 208, 32],  [56, 204, 108],
  [56, 180, 204], [60, 60, 60],   [0, 0, 0],      [0, 0, 0],
  [236, 238, 236],[168, 204, 236],[188, 188, 236],[212, 178, 236],
  [236, 174, 236],[236, 174, 212],[236, 180, 176],[228, 196, 144],
  [204, 210, 120],[180, 222, 120],[168, 226, 144],[152, 226, 180],
  [160, 214, 228],[160, 162, 160],[0, 0, 0],      [0, 0, 0],
];

// Material names for the 16 TSA block types (filename annotation only).
// Empirical mapping per src/nes/constants.ts BLOCK_PATTERNS — the spec doc
// §3.5 table is shifted relative to what the ROM actually stores.
const BLOCK_MATERIAL_NAMES: readonly string[] = [
  'brick-right', 'brick-bottom', 'brick-left', 'brick-top',
  'brick-full', 'steel-right', 'steel-bottom', 'steel-left',
  'steel-top', 'steel-full', 'water', 'jungle',
  'ice', 'empty', 'empty-e', 'empty-f',
];

// ── Minimal PNG encoder (RGBA8, single IDAT, no interlace).

const CRC32_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n >>> 0;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) >>> 0 : (c >>> 1);
    t[n] = c;
  }
  return t;
})();

function crc32(data: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < data.length; i++) c = CRC32_TABLE[(c ^ data[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(8 + data.length + 4);
  const view = new DataView(out.buffer);
  view.setUint32(0, data.length);
  out[4] = type.charCodeAt(0);
  out[5] = type.charCodeAt(1);
  out[6] = type.charCodeAt(2);
  out[7] = type.charCodeAt(3);
  out.set(data, 8);
  const crcInput = new Uint8Array(4 + data.length);
  crcInput.set(out.subarray(4, 8 + data.length), 0);
  view.setUint32(8 + data.length, crc32(crcInput));
  return out;
}

/** Encode an RGBA pixel buffer (width*height*4 bytes, top-to-bottom) as PNG. */
function encodePng(width: number, height: number, rgba: Uint8Array): Uint8Array {
  if (rgba.length !== width * height * 4) {
    throw new Error(`encodePng: expected ${width * height * 4} bytes, got ${rgba.length}`);
  }
  // Filter byte 0 (None) before each scanline.
  const filtered = new Uint8Array(height * (1 + width * 4));
  for (let y = 0; y < height; y++) {
    filtered[y * (1 + width * 4)] = 0;
    filtered.set(
      rgba.subarray(y * width * 4, (y + 1) * width * 4),
      y * (1 + width * 4) + 1,
    );
  }
  const idat = deflateSync(filtered);

  const ihdr = new Uint8Array(13);
  const ihdrView = new DataView(ihdr.buffer);
  ihdrView.setUint32(0, width);
  ihdrView.setUint32(4, height);
  ihdr[8] = 8;     // bit depth
  ihdr[9] = 6;     // color type: RGBA
  ihdr[10] = 0;    // compression
  ihdr[11] = 0;    // filter
  ihdr[12] = 0;    // interlace

  const sig = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdrChunk = chunk('IHDR', ihdr);
  const idatChunk = chunk('IDAT', new Uint8Array(idat.buffer, idat.byteOffset, idat.byteLength));
  const iendChunk = chunk('IEND', new Uint8Array(0));

  const out = new Uint8Array(sig.length + ihdrChunk.length + idatChunk.length + iendChunk.length);
  let o = 0;
  out.set(sig, o); o += sig.length;
  out.set(ihdrChunk, o); o += ihdrChunk.length;
  out.set(idatChunk, o); o += idatChunk.length;
  out.set(iendChunk, o);
  return out;
}

// ── CHR tile decoding.

/** Decode one 8×8 NES tile into 64 palette indices (0..3). */
function decodeTile(chr: Uint8Array, bankOffset: number, tileIdx: number): Uint8Array {
  const out = new Uint8Array(64);
  const base = bankOffset + tileIdx * 16;
  for (let row = 0; row < 8; row++) {
    const lo = chr[base + row];
    const hi = chr[base + row + 8];
    for (let col = 0; col < 8; col++) {
      const bit = 7 - col;
      out[row * 8 + col] = ((lo >> bit) & 1) | (((hi >> bit) & 1) << 1);
    }
  }
  return out;
}

// ── Pixel buffer helpers.

interface PixelBuffer {
  width: number;
  height: number;
  data: Uint8Array; // RGBA, top-to-bottom
}

function makeBuffer(width: number, height: number): PixelBuffer {
  return { width, height, data: new Uint8Array(width * height * 4) };
}

function setPixel(buf: PixelBuffer, x: number, y: number, r: number, g: number, b: number, a: number): void {
  const o = (y * buf.width + x) * 4;
  buf.data[o] = r; buf.data[o + 1] = g; buf.data[o + 2] = b; buf.data[o + 3] = a;
}

/**
 * Blit an 8×8 indexed tile at (dx,dy) using a 4-color ROM palette.
 * `transparentZero=true` makes index 0 fully transparent (sprite convention).
 */
function blitTile(
  buf: PixelBuffer,
  indices: Uint8Array,
  dx: number,
  dy: number,
  romPalette: readonly number[],
  transparentZero: boolean,
): void {
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const idx = indices[row * 8 + col];
      if (idx === 0 && transparentZero) {
        setPixel(buf, dx + col, dy + row, 0, 0, 0, 0);
        continue;
      }
      const masterIdx = romPalette[idx] & 0x3f;
      const [r, g, b] = NES_MASTER_PALETTE[masterIdx];
      setPixel(buf, dx + col, dy + row, r, g, b, 255);
    }
  }
}

// ── High-level extractors.

function extractRomPalettes(rom: Uint8Array): { sprite: number[][]; bg: number[][] } {
  const read = (off: number): number[][] => {
    const palettes: number[][] = [];
    for (let p = 0; p < 4; p++) {
      const start = off + p * 4;
      palettes.push([rom[start], rom[start + 1], rom[start + 2], rom[start + 3]]);
    }
    return palettes;
  };
  return { sprite: read(SPRITE_PAL_OFFSET), bg: read(BG_PAL_OFFSET) };
}

/** Render a full 256-tile bank as a 16×16 grid of 8×8 tiles (= 128×128 px). */
function renderBankTiles(
  rom: Uint8Array,
  bankOffset: number,
  romPalette: readonly number[],
  transparentZero: boolean,
): PixelBuffer {
  const buf = makeBuffer(128, 128);
  for (let t = 0; t < TILES_PER_BANK; t++) {
    const indices = decodeTile(rom, bankOffset, t);
    const tx = (t % 16) * 8;
    const ty = Math.floor(t / 16) * 8;
    blitTile(buf, indices, tx, ty, romPalette, transparentZero);
  }
  return buf;
}

/**
 * Render a 256-tile bank as an 8×8 grid of 16×16 quads (= 128×128 px).
 * 64 quads, each = 4 consecutive tiles in NES 8×16 mode layout:
 *   TL=base, BL=base+1, TR=base+2, BR=base+3.
 * Quad N uses tiles [N*4 .. N*4+3]. Tanks live in the upper rows of this grid.
 */
function renderBankQuads(
  rom: Uint8Array,
  bankOffset: number,
  romPalette: readonly number[],
  transparentZero: boolean,
): PixelBuffer {
  const buf = makeBuffer(128, 128);
  for (let q = 0; q < 64; q++) {
    const qx = (q % 8) * 16;
    const qy = Math.floor(q / 8) * 16;
    const baseTile = q * 4;
    // [TL, BL, TR, BR] — left 8×16 column then right 8×16 column.
    const offsets: ReadonlyArray<readonly [number, number]> = [[0, 0], [0, 8], [8, 0], [8, 8]];
    for (let i = 0; i < 4; i++) {
      const indices = decodeTile(rom, bankOffset, baseTile + i);
      blitTile(buf, indices, qx + offsets[i][0], qy + offsets[i][1], romPalette, transparentZero);
    }
  }
  return buf;
}

/**
 * Render a single 16×16 sprite quad starting at tile ID `baseTile`.
 * Uses NES 8×16 sprite mode layout: TL=base, BL=base+1, TR=base+2, BR=base+3
 * — left 8×16 column (T,T+1) sits next to right 8×16 column (T+2,T+3).
 * This is how Battle City stores tanks, items, and the bullet/explosion sprites.
 */
function renderSpriteQuad(
  rom: Uint8Array,
  baseTile: number,
  romPalette: readonly number[],
): PixelBuffer {
  const buf = makeBuffer(16, 16);
  const tileIds = [baseTile, baseTile + 1, baseTile + 2, baseTile + 3];
  // [TL, BL, TR, BR] — left column first, then right column.
  const offsets: ReadonlyArray<readonly [number, number]> = [[0, 0], [0, 8], [8, 0], [8, 8]];
  for (let i = 0; i < 4; i++) {
    const indices = decodeTile(rom, CHR_SPRITE_OFFSET, tileIds[i]);
    blitTile(buf, indices, offsets[i][0], offsets[i][1], romPalette, true);
  }
  return buf;
}

/** Render one terrain block (4 BG-bank tiles arranged TL/TR/BL/BR = 16×16 px). */
function renderTerrainBlock(
  rom: Uint8Array,
  blockType: number,
  bgPalettes: readonly number[][],
): PixelBuffer {
  const tsaBase = TSA_OFFSET + blockType * 4;
  const palIdx = rom[ATTR_TABLE_OFFSET + blockType] & 0x03;
  const palette = bgPalettes[palIdx];
  const buf = makeBuffer(16, 16);
  const positions: ReadonlyArray<readonly [number, number]> = [[0, 0], [8, 0], [0, 8], [8, 8]];
  for (let q = 0; q < 4; q++) {
    const tileId = rom[tsaBase + q];
    const indices = decodeTile(rom, CHR_BG_OFFSET, tileId);
    blitTile(buf, indices, positions[q][0], positions[q][1], palette, false);
  }
  return buf;
}

/** Render a 7×4 nametable region (eagle base) using a chosen BG palette. */
function renderEagleTsa(
  rom: Uint8Array,
  tsaOffset: number,
  romPalette: readonly number[],
): PixelBuffer {
  const cols = 7, rows = 4;
  const buf = makeBuffer(cols * 8, rows * 8);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const tileId = rom[tsaOffset + r * cols + c];
      const indices = decodeTile(rom, CHR_BG_OFFSET, tileId);
      blitTile(buf, indices, c * 8, r * 8, romPalette, false);
    }
  }
  return buf;
}

/** Visual palette reference: 8 palettes × 4 swatches, each swatch 16×16. */
function renderPaletteReference(
  spritePalettes: readonly number[][],
  bgPalettes: readonly number[][],
): PixelBuffer {
  const swatch = 16;
  const cols = 4;
  const rows = 8; // 4 sprite + 4 BG
  const buf = makeBuffer(cols * swatch, rows * swatch);
  const all = [...spritePalettes, ...bgPalettes];
  for (let p = 0; p < all.length; p++) {
    for (let c = 0; c < 4; c++) {
      const masterIdx = all[p][c] & 0x3f;
      const [r, g, b] = NES_MASTER_PALETTE[masterIdx];
      for (let y = 0; y < swatch; y++) {
        for (let x = 0; x < swatch; x++) {
          setPixel(buf, c * swatch + x, p * swatch + y, r, g, b, 255);
        }
      }
    }
  }
  return buf;
}

// ── CLI.

interface Args {
  rom: string;
  out: string | null;
}

function parseArgs(argv: string[]): Args {
  const positional: string[] = [];
  let out: string | null = null;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--out') {
      out = argv[++i];
    } else if (a.startsWith('--')) {
      throw new Error(`Unknown flag: ${a}`);
    } else {
      positional.push(a);
    }
  }
  if (positional.length !== 1) {
    throw new Error('Usage: tsx scripts/nes-extract-sprites.ts <rom.nes> [--out <dir>]');
  }
  return { rom: positional[0], out };
}

async function writePng(path: string, buf: PixelBuffer): Promise<void> {
  await writeFile(path, encodePng(buf.width, buf.height, buf.data));
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const romBytes = new Uint8Array(await readFile(resolve(args.rom)));
  parseRom(romBytes); // validates iNES header

  const romBase = basename(args.rom, extname(args.rom));
  const outDir = resolve(args.out ?? `data/graphics/${romBase}`);
  await mkdir(outDir, { recursive: true });
  await mkdir(resolve(outDir, 'terrain'), { recursive: true });
  await mkdir(resolve(outDir, 'eagle'), { recursive: true });
  await mkdir(resolve(outDir, 'sprites'), { recursive: true });

  const palettes = extractRomPalettes(romBytes);
  let written = 0;

  // Full CHR banks in each of 4 palettes + per-palette individual 16×16 quads.
  for (let p = 0; p < 4; p++) {
    const sprite = renderBankQuads(romBytes, CHR_SPRITE_OFFSET, palettes.sprite[p], true);
    const bg = renderBankTiles(romBytes, CHR_BG_OFFSET, palettes.bg[p], false);
    await writePng(resolve(outDir, `chr-sprite-pal${p}.png`), sprite);
    await writePng(resolve(outDir, `chr-bg-pal${p}.png`), bg);
    written += 2;

    const palDir = resolve(outDir, 'sprites', `pal${p}`);
    await mkdir(palDir, { recursive: true });
    for (let q = 0; q < 64; q++) {
      const baseTile = q * 4;
      const quad = renderSpriteQuad(romBytes, baseTile, palettes.sprite[p]);
      const name = `q${baseTile.toString(16).toUpperCase().padStart(2, '0')}.png`;
      await writePng(resolve(palDir, name), quad);
      written++;
    }
  }

  // Palette swatches.
  await writePng(
    resolve(outDir, 'palettes.png'),
    renderPaletteReference(palettes.sprite, palettes.bg),
  );
  written++;

  // 16 terrain blocks (authoritative — TSA + attr table).
  for (let b = 0; b < 16; b++) {
    const block = renderTerrainBlock(romBytes, b, palettes.bg);
    const name = `${b.toString(16).toUpperCase().padStart(2, '0')}_${BLOCK_MATERIAL_NAMES[b]}.png`;
    await writePng(resolve(outDir, 'terrain', name), block);
    written++;
  }

  // Eagle base composites in each BG palette.
  for (let p = 0; p < 4; p++) {
    const normal = renderEagleTsa(romBytes, EAGLE_TSA_OFFSET, palettes.bg[p]);
    const fortified = renderEagleTsa(romBytes, FORTIFIED_TSA_OFFSET, palettes.bg[p]);
    await writePng(resolve(outDir, 'eagle', `normal-pal${p}.png`), normal);
    await writePng(resolve(outDir, 'eagle', `fortified-pal${p}.png`), fortified);
    written += 2;
  }

  console.log(`Wrote ${written} PNG file(s) to ${outDir}`);
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});

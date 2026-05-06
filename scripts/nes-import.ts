#!/usr/bin/env tsx
// Convert original Battle City stages from a .nes ROM into MapDto JSON files.
//
// Usage:
//   tsx scripts/nes-import.ts <rom.nes> [--out <dir>] [--stage N] [--all]
//
// Default: extracts the 35 playable stages (0..34) into <out>/01.json … 35.json.
// --all also exports stage 35 (the demo / construction screen) as 36.json.

import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

import { validateMapDto } from '../src/map/MapDto';
import { parseRom, stageToMapDto, PLAYABLE_COUNT, STAGE_COUNT } from '../src/nes/index';

interface Args {
  rom: string;
  out: string;
  stage: number | null;
  all: boolean;
}

function parseArgs(argv: string[]): Args {
  const positional: string[] = [];
  let out = 'data/maps/nes';
  let stage: number | null = null;
  let all = false;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--out') {
      out = argv[++i];
    } else if (arg === '--stage') {
      stage = parseInt(argv[++i], 10);
    } else if (arg === '--all') {
      all = true;
    } else if (arg.startsWith('--')) {
      throw new Error(`Unknown flag: ${arg}`);
    } else {
      positional.push(arg);
    }
  }

  if (positional.length !== 1) {
    throw new Error('Usage: tsx scripts/nes-import.ts <rom.nes> [--out <dir>] [--stage N] [--all]');
  }
  return { rom: positional[0], out, stage, all };
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const romBytes = new Uint8Array(await readFile(resolve(args.rom)));
  const rom = parseRom(romBytes);
  const outDir = resolve(args.out);
  await mkdir(outDir, { recursive: true });

  const indices = args.stage !== null
    ? [args.stage]
    : Array.from({ length: args.all ? STAGE_COUNT : PLAYABLE_COUNT }, (_, i) => i);

  let written = 0;
  for (const idx of indices) {
    const dto = stageToMapDto(rom, idx);
    if (!validateMapDto(dto)) {
      const errors = (validateMapDto.errors ?? []).map((e) => `${e.instancePath} ${e.message}`).join('; ');
      throw new Error(`Stage ${idx + 1} produced invalid MapDto: ${errors}`);
    }
    const filename = `${String(idx + 1).padStart(2, '0')}.json`;
    const path = resolve(outDir, filename);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, JSON.stringify(dto, null, 2) + '\n');
    written++;
  }

  console.log(`Wrote ${written} stage(s) to ${outDir}`);
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});

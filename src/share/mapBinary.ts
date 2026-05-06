import { TS } from '../editor/constants';
import type { MapDto, SpawnPoint, TerrainRegion } from '../editor/types';

import { CURRENT_ENUMS, CURRENT_FORMAT_VERSION, VERSIONED_ENUMS } from './mapEnums';

function indexOf<T extends readonly string[]>(arr: T, val: string | undefined, fallback = 0): number {
  if (!val) return fallback;
  const i = (arr as readonly string[]).indexOf(val);
  return i === -1 ? fallback : i;
}

class Writer {
  private chunks: number[] = [];
  u8(v: number): void { this.chunks.push(v & 0xff); }
  u16(v: number): void { this.chunks.push(v & 0xff, (v >>> 8) & 0xff); }
  bytes(b: Uint8Array): void { for (let i = 0; i < b.length; i++) this.chunks.push(b[i]); }
  toUint8Array(): Uint8Array { return new Uint8Array(this.chunks); }
}

class Reader {
  private i = 0;
  constructor(private readonly buf: Uint8Array) {}
  u8(): number { return this.buf[this.i++]; }
  u16(): number { const v = this.buf[this.i] | (this.buf[this.i + 1] << 8); this.i += 2; return v; }
  bytes(n: number): Uint8Array { const v = this.buf.subarray(this.i, this.i + n); this.i += n; return v; }
  eof(): boolean { return this.i >= this.buf.length; }
}

function spawnsToBytes(w: Writer, list: SpawnPoint[]): void {
  w.u8(Math.min(255, list.length));
  for (let i = 0; i < Math.min(255, list.length); i++) {
    const s = list[i];
    w.u8(Math.round(s.x / TS));
    w.u8(Math.round(s.y / TS));
  }
}

function readSpawns(r: Reader): SpawnPoint[] {
  const n = r.u8();
  const out: SpawnPoint[] = [];
  for (let i = 0; i < n; i++) out.push({ x: r.u8() * TS, y: r.u8() * TS });
  return out;
}

export function packMap(dto: MapDto): Uint8Array {
  const w = new Writer();
  w.u8(CURRENT_FORMAT_VERSION);

  const enums = CURRENT_ENUMS;

  const title = dto.title ?? '';
  const titleBytes = title ? new TextEncoder().encode(title).slice(0, 255) : new Uint8Array(0);
  const flags =
    (titleBytes.length > 0 ? 0x01 : 0) |
    (dto.viewMode === 'scroll' ? 0x02 : 0);
  w.u8(flags);

  const wTiles = Math.min(255, Math.max(1, Math.round(dto.width  / TS)));
  const hTiles = Math.min(255, Math.max(1, Math.round(dto.height / TS)));
  w.u8(wTiles);
  w.u8(hTiles);

  if (titleBytes.length > 0) {
    w.u8(titleBytes.length);
    w.bytes(titleBytes);
  }

  const enemy = dto.spawn.enemy;
  w.u8(Math.min(255, Math.round((enemy.spawnDelay ?? 3) * 10)));
  w.u8(Math.min(255, enemy.maxAliveCount ?? 4));

  const list = enemy.list ?? [];
  w.u8(Math.min(255, list.length));
  for (let i = 0; i < Math.min(255, list.length); i++) {
    const e = list[i];
    const t = indexOf(enums.enemyTypes, e.type) & 0x03;
    const a = indexOf(enums.enemyAis, e.ai) & 0x03;
    const d = indexOf(enums.drops, e.drop) & 0x07;
    w.u8((t << 6) | (a << 4) | d);
  }

  spawnsToBytes(w, enemy.locations ?? []);
  spawnsToBytes(w, dto.spawn.player.locations ?? []);
  spawnsToBytes(w, dto.spawn.bases ?? (dto.spawn.base ? [dto.spawn.base] : []));

  const regions = dto.terrain.regions ?? [];
  w.u16(Math.min(0xffff, regions.length));
  for (let i = 0; i < Math.min(0xffff, regions.length); i++) {
    const r = regions[i];
    w.u8(indexOf(enums.terrainTypes, r.type, 1));
    w.u8(Math.round(r.x / TS) & 0xff);
    w.u8(Math.round(r.y / TS) & 0xff);
    w.u8(Math.max(1, Math.round(r.width  / TS)) & 0xff);
    w.u8(Math.max(1, Math.round(r.height / TS)) & 0xff);
  }

  return w.toUint8Array();
}

export function unpackMap(buf: Uint8Array): MapDto {
  const r = new Reader(buf);
  const version = r.u8();
  const enums = VERSIONED_ENUMS[version];
  if (!enums) throw new Error(`Unsupported map binary version: ${version}`);

  const flags = r.u8();
  const wTiles = r.u8();
  const hTiles = r.u8();

  let title: string | undefined;
  if (flags & 0x01) {
    const len = r.u8();
    title = new TextDecoder().decode(r.bytes(len));
  }

  const spawnDelay    = r.u8() / 10;
  const maxAliveCount = r.u8();

  const listLen = r.u8();
  const list: Array<{ type: string; ai: string; drop?: string }> = [];
  for (let i = 0; i < listLen; i++) {
    const b = r.u8();
    const t = (b >> 6) & 0x03;
    const a = (b >> 4) & 0x03;
    const d = b & 0x07;
    const entry: { type: string; ai: string; drop?: string } = {
      type: enums.enemyTypes[t],
      ai:   enums.enemyAis[a],
    };
    if (d !== 0) entry.drop = enums.drops[d];
    list.push(entry);
  }

  const enemyLocs  = readSpawns(r);
  const playerLocs = readSpawns(r);
  const bases      = readSpawns(r);

  const regionCount = r.u16();
  const regions: TerrainRegion[] = [];
  for (let i = 0; i < regionCount; i++) {
    const typeIdx = r.u8();
    const col = r.u8();
    const row = r.u8();
    const wT = r.u8();
    const hT = r.u8();
    regions.push({
      type: enums.terrainTypes[typeIdx] || 'brick',
      x: col * TS,
      y: row * TS,
      width:  wT * TS,
      height: hT * TS,
    });
  }

  const dto: MapDto = {
    tileset: 'classic',
    width:  wTiles * TS,
    height: hTiles * TS,
    spawn: {
      enemy: { spawnDelay, maxAliveCount, list, locations: enemyLocs },
      player: { locations: playerLocs },
      bases,
    },
    terrain: { regions },
  };
  if (title !== undefined) dto.title = title;
  if (flags & 0x02) dto.viewMode = 'scroll';
  return dto;
}

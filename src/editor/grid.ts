import { FIELD, GW, GH, TS, BRUSHES, T2I, I2T } from './constants';
import { state } from './state';
import type { TerrainRegion } from './types';

export function getCell(col: number, row: number): number {
  if (col < 0 || col >= GW || row < 0 || row >= GH) return 0;
  return state.grid[row * GW + col];
}

export function setCell(col: number, row: number, v: number): void {
  if (col < 0 || col >= GW || row < 0 || row >= GH) return;
  state.grid[row * GW + col] = v;
}

function snapBrush(wx: number, wy: number, size: number): { sx: number; sy: number } {
  const half = size / 2;
  const sx = Math.max(0, Math.min(FIELD - size, Math.round((wx - half) / size) * size));
  const sy = Math.max(0, Math.min(FIELD - size, Math.round((wy - half) / size) * size));
  return { sx, sy };
}

export { snapBrush };

export function cellAt(wx: number, wy: number): { col: number; row: number } {
  return {
    col: Math.max(0, Math.min(GW - 1, Math.floor(wx / TS))),
    row: Math.max(0, Math.min(GH - 1, Math.floor(wy / TS))),
  };
}

export function paintRect(c0: number, r0: number, c1: number, r1: number, terrainIdx: number, step = 1): void {
  const bcMin = Math.min(Math.floor(c0 / step), Math.floor(c1 / step));
  const bcMax = Math.max(Math.floor(c0 / step), Math.floor(c1 / step));
  const brMin = Math.min(Math.floor(r0 / step), Math.floor(r1 / step));
  const brMax = Math.max(Math.floor(r0 / step), Math.floor(r1 / step));
  for (let r = brMin * step; r < (brMax + 1) * step; r++) {
    for (let c = bcMin * step; c < (bcMax + 1) * step; c++) {
      setCell(c, r, terrainIdx);
    }
  }
}

export function lineCells(c0: number, r0: number, c1: number, r1: number): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  let x0 = c0, y0 = r0;
  const dx = Math.abs(c1 - x0);
  const dy = -Math.abs(r1 - y0);
  const sx = x0 < c1 ? 1 : -1;
  const sy = y0 < r1 ? 1 : -1;
  let err = dx + dy;
  while (true) {
    out.push([x0, y0]);
    if (x0 === c1 && y0 === r1) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x0 += sx; }
    if (e2 <= dx) { err += dx; y0 += sy; }
  }
  return out;
}

export function paintLine(c0: number, r0: number, c1: number, r1: number, terrainIdx: number, step = 1): void {
  const blocks = lineCells(
    Math.floor(c0 / step), Math.floor(r0 / step),
    Math.floor(c1 / step), Math.floor(r1 / step),
  );
  for (const [bc, br] of blocks) {
    for (let r = br * step; r < (br + 1) * step; r++) {
      for (let c = bc * step; c < (bc + 1) * step; c++) {
        setCell(c, r, terrainIdx);
      }
    }
  }
}

/**
 * 4-connected flood fill. Replaces all cells matching the seed's value with `replacementIdx`.
 * If `cellLimit` is provided and exceeded, returns false (caller may use this as an early-bail
 * signal for hover previews); otherwise commits and returns true.
 */
export function floodFill(
  seedCol: number,
  seedRow: number,
  replacementIdx: number,
  cellLimit?: number,
): { matched: Array<[number, number]>; capped: boolean } {
  const matched: Array<[number, number]> = [];
  if (seedCol < 0 || seedCol >= GW || seedRow < 0 || seedRow >= GH) {
    return { matched, capped: false };
  }
  const target = state.grid[seedRow * GW + seedCol];
  if (target === replacementIdx) return { matched, capped: false };

  const visited = new Uint8Array(GW * GH);
  const stack: Array<[number, number]> = [[seedCol, seedRow]];
  const limit = cellLimit ?? GW * GH;

  while (stack.length) {
    const [c, r] = stack.pop()!;
    if (c < 0 || c >= GW || r < 0 || r >= GH) continue;
    const k = r * GW + c;
    if (visited[k]) continue;
    if (state.grid[k] !== target) continue;
    visited[k] = 1;
    matched.push([c, r]);
    if (matched.length > limit) {
      return { matched, capped: true };
    }
    stack.push([c + 1, r], [c - 1, r], [c, r + 1], [c, r - 1]);
  }
  return { matched, capped: false };
}

export function paint(wx: number, wy: number, erase: boolean): void {
  const b = BRUSHES[state.brushIdx];
  const { sx, sy } = snapBrush(wx, wy, b.size);
  const col0 = Math.round(sx / TS);
  const row0 = Math.round(sy / TS);

  if (col0 === state.lastPaintCol && row0 === state.lastPaintRow) return;
  state.lastPaintCol = col0;
  state.lastPaintRow = row0;

  const n = b.size / TS;
  const v = erase ? 0 : (T2I[b.type ?? ''] ?? 0);

  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      setCell(col0 + c, row0 + r, v);
    }
  }
}

/** Greedy rectangle merge: grid cells → compact region list */
export function gridToRegions(): TerrainRegion[] {
  const visited = new Uint8Array(GW * GH);
  const regions: TerrainRegion[] = [];

  for (let ti = 1; ti <= 5; ti++) {
    for (let row = 0; row < GH; row++) {
      for (let col = 0; col < GW; col++) {
        if (state.grid[row * GW + col] !== ti || visited[row * GW + col]) continue;

        let w = 1;
        while (col + w < GW && state.grid[row * GW + col + w] === ti && !visited[row * GW + col + w]) w++;

        let h = 1;
        outer: while (row + h < GH) {
          for (let c = 0; c < w; c++) {
            if (state.grid[(row + h) * GW + col + c] !== ti || visited[(row + h) * GW + col + c]) break outer;
          }
          h++;
        }

        for (let r = 0; r < h; r++) {
          for (let c = 0; c < w; c++) {
            visited[(row + r) * GW + col + c] = 1;
          }
        }

        regions.push({ type: I2T[ti], x: col * TS, y: row * TS, width: w * TS, height: h * TS });
      }
    }
  }
  return regions;
}

/** Parse region list → fill grid */
export function regionsToGrid(regions: TerrainRegion[]): void {
  state.grid.fill(0);
  for (const r of regions) {
    const ti = T2I[r.type] ?? 0;
    if (!ti) continue;
    const c0 = Math.round(r.x / TS);
    const r0 = Math.round(r.y / TS);
    const c1 = Math.round((r.x + r.width)  / TS);
    const r1 = Math.round((r.y + r.height) / TS);
    for (let row = r0; row < r1; row++) {
      for (let col = c0; col < c1; col++) {
        setCell(col, row, ti);
      }
    }
  }
}

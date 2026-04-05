import { GW, GH, TS, BRUSHES, SNAP, T2I, I2T } from './constants';
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

export function paint(wx: number, wy: number, erase: boolean): void {
  const b    = BRUSHES[state.brushIdx];
  const snap = erase ? TS : (b.type ? SNAP[b.type] : TS);
  const sx   = Math.floor(wx / snap) * snap;
  const sy   = Math.floor(wy / snap) * snap;
  const col0 = Math.round(sx / TS);
  const row0 = Math.round(sy / TS);
  const n    = b.size / TS;
  const v    = erase ? 0 : (T2I[b.type ?? ''] ?? 0);

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

import { TS, TM, TL, COLORS, BRUSHES, I2T, SRECTS, SPRITE_SRC, PLAYER_TANK_RECTS, ENEMY_TANK_RECTS, ENEMY_TANK_DROP_RECTS } from './constants';
import { state } from './state';
import { snapBrush, cellAt, lineCells, floodFill } from './grid';

// ── Canvas refs (set via setup()) ──────────────────
let canvas: HTMLCanvasElement;
let ctx: CanvasRenderingContext2D;
let viewport: HTMLElement;

export let spriteImg: HTMLImageElement | null = null;
export let spriteReady = false;

export function setup(canvasEl: HTMLCanvasElement, viewportEl: HTMLElement): void {
  canvas   = canvasEl;
  ctx      = canvasEl.getContext('2d')!;
  viewport = viewportEl;
}

export function getCanvas(): HTMLCanvasElement { return canvas; }

// ── Coord transforms ───────────────────────────────
export function w2c(wx: number, wy: number) {
  return { x: wx * state.zoom + state.panX, y: wy * state.zoom + state.panY };
}
export function c2w(cx: number, cy: number) {
  return { x: (cx - state.panX) / state.zoom, y: (cy - state.panY) / state.zoom };
}

// ── Layout ────────────────────────────────────────
export function resizeCanvas(): void {
  canvas.width  = viewport.clientWidth;
  canvas.height = viewport.clientHeight;
}

export function centerView(): void {
  const padding = 40;
  const scaleX  = (canvas.width  - padding * 2) / state.fieldWidth;
  const scaleY  = (canvas.height - padding * 2) / state.fieldHeight;
  state.zoom    = Math.min(scaleX, scaleY, 1);
  const fw      = state.fieldWidth  * state.zoom;
  const fh      = state.fieldHeight * state.zoom;
  state.panX    = (canvas.width  - fw) / 2;
  state.panY    = (canvas.height - fh) / 2;
  const el = document.getElementById('st-zoom');
  if (el) el.textContent = `Zoom: ${Math.round(state.zoom * 100)}%`;
}

// ── Sprite loading ────────────────────────────────
export function loadSprite(onReady: () => void): void {
  spriteImg         = new Image();
  spriteImg.onload  = () => { spriteReady = true; onReady(); };
  spriteImg.onerror = () => { console.warn('Sprite not found — using solid colours'); render(); };
  spriteImg.src     = SPRITE_SRC;
}

export function paintBrushSwatches(): void {
  document.querySelectorAll<HTMLCanvasElement>('.brush-btn .swatch').forEach(sw => {
    const type = sw.dataset.brushType;
    if (!type || !spriteImg) return;
    const r    = SRECTS[type];
    const swCtx = sw.getContext('2d')!;
    swCtx.clearRect(0, 0, 11, 11);
    swCtx.drawImage(spriteImg, r[0], r[1], Math.min(r[2], 11), Math.min(r[3], 11), 0, 0, 11, 11);
  });
}

export function paintEnemyPreview(canvas: HTMLCanvasElement, kind: string, hasDrop: boolean): void {
  const ctx2 = canvas.getContext('2d')!;
  const w = canvas.width, h = canvas.height;
  ctx2.clearRect(0, 0, w, h);
  const set = hasDrop ? ENEMY_TANK_DROP_RECTS : ENEMY_TANK_RECTS;
  if (spriteReady && spriteImg) {
    const r = set[kind] ?? set.basic;
    ctx2.imageSmoothingEnabled = false;
    const scale = Math.min(w / r[2], h / r[3]);
    const dw = r[2] * scale, dh = r[3] * scale;
    ctx2.drawImage(spriteImg, r[0], r[1], r[2], r[3], (w - dw) / 2, (h - dh) / 2, dw, dh);
  } else {
    ctx2.fillStyle = hasDrop ? '#3a1a4a' : '#21262d';
    ctx2.fillRect(0, 0, w, h);
    ctx2.fillStyle = hasDrop ? '#d2a8ff' : '#8b949e';
    ctx2.font = `bold 9px 'Courier New', monospace`;
    ctx2.textAlign = 'center';
    ctx2.textBaseline = 'middle';
    ctx2.fillText(kind.charAt(0).toUpperCase(), w / 2, h / 2);
  }
}

export function paintEnemyPreviews(): void {
  document.querySelectorAll<HTMLCanvasElement>('.enemy-preview').forEach(cv => {
    paintEnemyPreview(cv, cv.dataset.kind ?? 'basic', cv.dataset.drop === '1');
  });
}

// ── Main render ───────────────────────────────────
export function render(): void {
  if (!canvas) return;
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);

  ctx.fillStyle = '#0d1117';
  ctx.fillRect(0, 0, W, H);

  const fp = w2c(0, 0);
  const fw = state.fieldWidth  * state.zoom;
  const fh = state.fieldHeight * state.zoom;

  // Field background
  ctx.fillStyle = '#131f11';
  ctx.fillRect(fp.x, fp.y, fw, fh);

  // ── Terrain ──
  for (let row = 0; row < state.gh; row++) {
    for (let col = 0; col < state.gw; col++) {
      const v = state.grid[row * state.gw + col];
      if (!v) continue;
      const type = I2T[v];
      const p    = w2c(col * TS, row * TS);
      const sz   = TS * state.zoom;

      if (spriteReady && spriteImg) {
        if (type === 'brick') {
          const r = (col + row) % 2 === 0 ? SRECTS.brick : SRECTS.brick2;
          ctx.drawImage(spriteImg, r[0], r[1], TS, TS, p.x, p.y, sz + 0.5, sz + 0.5);
        } else {
          const r  = SRECTS[type];
          const ox = (col % (r[2] / TS)) * TS;
          const oy = (row % (r[3] / TS)) * TS;
          ctx.drawImage(spriteImg, r[0] + ox, r[1] + oy, TS, TS, p.x, p.y, sz + 0.5, sz + 0.5);
        }
      } else {
        ctx.fillStyle = COLORS[type];
        ctx.fillRect(p.x, p.y, sz + 0.5, sz + 0.5);
      }
    }
  }

  // ── Grid overlay ──
  if (state.showGrid) {
    drawGridLines(TS, 'rgba(255,255,255,0.04)', 0.5);
    drawGridLines(TM, 'rgba(255,255,255,0.07)', 0.5);
    drawGridLines(TL, 'rgba(255,255,255,0.13)', 0.5);
  }

  // Field border
  ctx.strokeStyle = '#3d4450';
  ctx.lineWidth   = 1;
  ctx.strokeRect(fp.x - 0.5, fp.y - 0.5, fw + 1, fh + 1);

  // ── Markers ──
  state.basePositions.forEach((s, i) => drawBase(s.x, s.y, state.basePositions.length > 1 ? `B${i + 1}` : 'BASE'));
  state.playerSpawns.forEach((s, i) => drawMarker(s.x, s.y, `P${i + 1}`, '#1f6feb', '#74b0ff', PLAYER_TANK_RECTS[i % PLAYER_TANK_RECTS.length]));
  state.enemySpawns.forEach( (s, i) => drawMarker(s.x, s.y, `E${i + 1}`, '#da3633', '#ff8080', SRECTS.enemyTank));

  // ── Brush preview ──
  if (state.mode === 'terrain' && !state.isPanning) {
    const tool = state.paintTool;
    if (state.isDrawing && !state.isErasing && (tool === 'rect' || tool === 'line')) {
      drawShapePreview(tool);
    } else if (!state.isDrawing && tool === 'fill') {
      drawFillHoverPreview();
    } else {
      drawBrushPreview();
    }
  }
  if (state.mode === 'base-spawn' && !state.isPanning) drawBasePreview();
  if (state.mode === 'player-spawn' && !state.isPanning) {
    const nextIdx = Math.min(state.playerSpawns.length, PLAYER_TANK_RECTS.length - 1);
    drawSpawnPreview('#1f6feb', PLAYER_TANK_RECTS[nextIdx]);
  }
  if (state.mode === 'enemy-spawn' && !state.isPanning) drawSpawnPreview('#da3633', SRECTS.enemyTank);
}

function drawGridLines(tileSize: number, color: string, lw: number): void {
  const fp = w2c(0, 0);
  const fw = state.fieldWidth  * state.zoom;
  const fh = state.fieldHeight * state.zoom;
  const colCount = Math.ceil(state.fieldWidth  / tileSize);
  const rowCount = Math.ceil(state.fieldHeight / tileSize);

  ctx.strokeStyle = color;
  ctx.lineWidth   = lw;

  for (let i = 0; i <= colCount; i++) {
    const p = w2c(i * tileSize, 0);
    ctx.beginPath(); ctx.moveTo(p.x, fp.y); ctx.lineTo(p.x, fp.y + fh); ctx.stroke();
  }
  for (let j = 0; j <= rowCount; j++) {
    const p = w2c(0, j * tileSize);
    ctx.beginPath(); ctx.moveTo(fp.x, p.y); ctx.lineTo(fp.x + fw, p.y); ctx.stroke();
  }
}

function drawBase(wx: number, wy: number, label: string): void {
  const p  = w2c(wx, wy);
  const sz = TL * state.zoom;

  if (spriteReady && spriteImg) {
    const r = SRECTS['base'];
    ctx.drawImage(spriteImg, r[0], r[1], r[2], r[3], p.x, p.y, sz, sz);
    ctx.fillStyle    = '#e3b341';
    ctx.font         = `bold ${Math.max(8, Math.round(9 * state.zoom))}px 'Courier New', monospace`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(label, p.x + sz / 2, p.y - 2 * state.zoom);
  } else {
    ctx.strokeStyle = '#e3b341';
    ctx.lineWidth   = 2;
    ctx.strokeRect(p.x, p.y, sz, sz);
    ctx.fillStyle    = 'rgba(227,179,65,0.12)';
    ctx.fillRect(p.x, p.y, sz, sz);
    ctx.fillStyle    = '#e3b341';
    ctx.font         = `bold ${Math.max(8, Math.round(10 * state.zoom))}px 'Courier New', monospace`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, p.x + sz / 2, p.y + sz / 2);
  }
}

function drawMarker(
  wx: number, wy: number,
  label: string,
  fillColor: string, textColor: string,
  sprRect: [number, number, number, number],
): void {
  const tp  = w2c(wx, wy);
  const sz  = TL * state.zoom;
  const mid = { x: tp.x + sz / 2, y: tp.y + sz / 2 };

  if (spriteReady && spriteImg) {
    ctx.beginPath();
    ctx.arc(mid.x, mid.y, sz * 0.45, 0, Math.PI * 2);
    ctx.fillStyle   = fillColor + '44';
    ctx.fill();
    ctx.strokeStyle = fillColor + 'cc';
    ctx.lineWidth   = 1.5;
    ctx.stroke();

    const sw = sprRect[2], sh = sprRect[3];
    const dw = sw * state.zoom, dh = sh * state.zoom;
    ctx.drawImage(spriteImg, sprRect[0], sprRect[1], sw, sh,
      tp.x + (sz - dw) / 2, tp.y + (sz - dh) / 2, dw, dh);

    ctx.fillStyle    = fillColor;
    ctx.font         = `bold ${Math.max(8, Math.round(9 * state.zoom))}px 'Courier New', monospace`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(label, mid.x, tp.y - 2 * state.zoom);
  } else {
    const r = Math.max(8, 13 * state.zoom);
    ctx.beginPath();
    ctx.arc(mid.x, mid.y, r, 0, Math.PI * 2);
    ctx.fillStyle   = fillColor + 'dd';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.lineWidth   = 1;
    ctx.stroke();
    ctx.fillStyle    = textColor;
    ctx.font         = `bold ${Math.max(7, Math.round(9 * state.zoom))}px 'Courier New', monospace`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, mid.x, mid.y);
  }
}

function drawBasePreview(): void {
  const sx = Math.floor(state.mouseWX / TL) * TL;
  const sy = Math.floor(state.mouseWY / TL) * TL;
  const p  = w2c(sx, sy);
  const sz = TL * state.zoom;

  ctx.globalAlpha = 0.5;
  if (spriteReady && spriteImg) {
    const r = SRECTS['base'];
    ctx.drawImage(spriteImg, r[0], r[1], r[2], r[3], p.x, p.y, sz, sz);
  } else {
    ctx.strokeStyle = '#e3b341';
    ctx.lineWidth   = 2;
    ctx.strokeRect(p.x, p.y, sz, sz);
  }
  ctx.globalAlpha = 1;
}

function drawSpawnPreview(color: string, sprRect: [number, number, number, number]): void {
  const sx  = Math.floor(state.mouseWX / TL) * TL;
  const sy  = Math.floor(state.mouseWY / TL) * TL;
  const p   = w2c(sx, sy);
  const sz  = TL * state.zoom;
  const mid = { x: p.x + sz / 2, y: p.y + sz / 2 };

  ctx.globalAlpha = 0.5;
  ctx.beginPath();
  ctx.arc(mid.x, mid.y, sz * 0.45, 0, Math.PI * 2);
  ctx.fillStyle   = color + '44';
  ctx.fill();
  ctx.strokeStyle = color + 'cc';
  ctx.lineWidth   = 1.5;
  ctx.stroke();

  if (spriteReady && spriteImg) {
    const sw = sprRect[2], sh = sprRect[3];
    const dw = sw * state.zoom, dh = sh * state.zoom;
    ctx.drawImage(spriteImg, sprRect[0], sprRect[1], sw, sh,
      p.x + (sz - dw) / 2, p.y + (sz - dh) / 2, dw, dh);
  }
  ctx.globalAlpha = 1;
}

function brushColors(): { fill: string; stroke: string } {
  const b = BRUSHES[state.brushIdx];
  if (b.type) return { fill: COLORS[b.type] + '55', stroke: COLORS[b.type] };
  return { fill: 'rgba(255,80,80,0.18)', stroke: '#f85149' };
}

function drawShapePreview(tool: 'rect' | 'line'): void {
  const b = BRUSHES[state.brushIdx];
  const step = Math.max(1, Math.floor(b.size / TS));
  const cur = cellAt(state.mouseWX, state.mouseWY);
  const startBC = Math.floor(state.dragStartCol / step);
  const startBR = Math.floor(state.dragStartRow / step);
  const endBC = Math.floor(cur.col / step);
  const endBR = Math.floor(cur.row / step);

  const { fill, stroke } = brushColors();
  ctx.fillStyle = fill;
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 1.5;

  const blockPx = step * TS;
  if (tool === 'rect') {
    const bcMin = Math.min(startBC, endBC);
    const bcMax = Math.max(startBC, endBC);
    const brMin = Math.min(startBR, endBR);
    const brMax = Math.max(startBR, endBR);
    const p = w2c(bcMin * blockPx, brMin * blockPx);
    const w = (bcMax - bcMin + 1) * blockPx * state.zoom;
    const h = (brMax - brMin + 1) * blockPx * state.zoom;
    ctx.fillRect(p.x, p.y, w, h);
    ctx.strokeRect(p.x, p.y, w, h);
  } else {
    const blocks = lineCells(startBC, startBR, endBC, endBR);
    const sz = blockPx * state.zoom;
    for (const [bc, br] of blocks) {
      const p = w2c(bc * blockPx, br * blockPx);
      ctx.fillRect(p.x, p.y, sz + 0.5, sz + 0.5);
    }
  }
}

function drawFillHoverPreview(): void {
  const cur = cellAt(state.mouseWX, state.mouseWY);
  if (state.mouseWX < 0 || state.mouseWX >= state.fieldWidth || state.mouseWY < 0 || state.mouseWY >= state.fieldHeight) return;
  const result = floodFill(cur.col, cur.row, -1, 512);
  if (result.matched.length === 0 || result.capped) return;

  const { fill } = brushColors();
  ctx.fillStyle = fill;
  const sz = TS * state.zoom;
  for (const [c, r] of result.matched) {
    const p = w2c(c * TS, r * TS);
    ctx.fillRect(p.x, p.y, sz + 0.5, sz + 0.5);
  }
}

function drawBrushPreview(): void {
  const b = BRUSHES[state.brushIdx];
  const { sx, sy } = snapBrush(state.mouseWX, state.mouseWY, b.size);
  const p  = w2c(sx, sy);
  const sz = b.size * state.zoom;

  if (b.type) {
    ctx.fillStyle   = COLORS[b.type] + '55';
    ctx.strokeStyle = COLORS[b.type];
  } else {
    ctx.fillStyle   = 'rgba(255,80,80,0.18)';
    ctx.strokeStyle = '#f85149';
  }
  ctx.fillRect(p.x, p.y, sz, sz);
  ctx.lineWidth = 1.5;
  ctx.strokeRect(p.x, p.y, sz, sz);
}

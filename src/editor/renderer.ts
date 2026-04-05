import { FIELD, TS, TM, TL, GW, GH, COLORS, SNAP, BRUSHES, I2T, SRECTS, BASE_POS, SPRITE_SRC } from './constants';
import { state } from './state';

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
  const fs      = FIELD * state.zoom;
  state.panX    = (canvas.width  - fs) / 2;
  state.panY    = (canvas.height - fs) / 2;
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

// ── Main render ───────────────────────────────────
export function render(): void {
  if (!canvas) return;
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);

  ctx.fillStyle = '#0d1117';
  ctx.fillRect(0, 0, W, H);

  const fp = w2c(0, 0);
  const fs = FIELD * state.zoom;

  // Field background
  ctx.fillStyle = '#131f11';
  ctx.fillRect(fp.x, fp.y, fs, fs);

  // ── Terrain ──
  for (let row = 0; row < GH; row++) {
    for (let col = 0; col < GW; col++) {
      const v = state.grid[row * GW + col];
      if (!v) continue;
      const type = I2T[v];
      const p    = w2c(col * TS, row * TS);
      const sz   = TS * state.zoom;

      if (spriteReady && spriteImg) {
        const r  = SRECTS[type];
        const nw = r[2], nh = r[3];
        const ox = (col % (nw / TS)) * TS;
        const oy = (row % (nh / TS)) * TS;
        ctx.drawImage(spriteImg, r[0] + ox, r[1] + oy, TS, TS, p.x, p.y, sz + 0.5, sz + 0.5);
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
  ctx.strokeRect(fp.x - 0.5, fp.y - 0.5, fs + 1, fs + 1);

  // ── Markers ──
  drawBase();
  state.playerSpawns.forEach((s, i) => drawMarker(s.x, s.y, `P${i + 1}`, '#1f6feb', '#74b0ff', SRECTS.playerTank));
  state.enemySpawns.forEach( (s, i) => drawMarker(s.x, s.y, `E${i + 1}`, '#da3633', '#ff8080', SRECTS.enemyTank));

  // ── Brush preview ──
  if (state.mode === 'terrain' && !state.isPanning) drawBrushPreview();
}

function drawGridLines(tileSize: number, color: string, lw: number): void {
  const fp   = w2c(0, 0);
  const fs   = FIELD * state.zoom;
  const count = GW * TS / tileSize;

  ctx.strokeStyle = color;
  ctx.lineWidth   = lw;

  for (let i = 0; i <= count; i++) {
    const p = w2c(i * tileSize, 0);
    ctx.beginPath(); ctx.moveTo(p.x, fp.y); ctx.lineTo(p.x, fp.y + fs); ctx.stroke();
  }
  for (let j = 0; j <= count; j++) {
    const p = w2c(0, j * tileSize);
    ctx.beginPath(); ctx.moveTo(fp.x, p.y); ctx.lineTo(fp.x + fs, p.y); ctx.stroke();
  }
}

function drawBase(): void {
  const p  = w2c(BASE_POS.x, BASE_POS.y);
  const sz = TL * state.zoom;

  if (spriteReady && spriteImg) {
    const r = SRECTS['base'];
    ctx.drawImage(spriteImg, r[0], r[1], r[2], r[3], p.x, p.y, sz, sz);
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
    ctx.fillText('BASE', p.x + sz / 2, p.y + sz / 2);
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

function drawBrushPreview(): void {
  const b    = BRUSHES[state.brushIdx];
  const snap = b.type ? SNAP[b.type] : TS;
  const sx   = Math.floor(state.mouseWX / snap) * snap;
  const sy   = Math.floor(state.mouseWY / snap) * snap;
  const p    = w2c(sx, sy);
  const sz   = b.size * state.zoom;

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

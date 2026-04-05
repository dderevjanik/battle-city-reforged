import { BRUSHES, COLORS, SRECTS } from './constants';
import { pushHistory } from './history';
import { render, paintBrushSwatches, spriteReady } from './renderer';
import { state } from './state';
import type { EditorMode } from './types';

// ── Brush list ────────────────────────────────────
export function buildBrushList(): void {
  const el = document.getElementById('brush-list')!;
  el.innerHTML = '';

  BRUSHES.forEach((b, i) => {
    const btn     = document.createElement('button');
    btn.className = `brush-btn${i === state.brushIdx ? ' active' : ''}`;
    btn.id        = `brush-${i}`;

    const sw           = document.createElement('canvas');
    sw.width           = 11;
    sw.height          = 11;
    sw.className       = 'swatch';
    sw.style.imageRendering = 'pixelated';
    sw.dataset.brushType   = b.type ?? '';

    const swCtx = sw.getContext('2d')!;
    if (b.type) {
      swCtx.fillStyle = COLORS[b.type];
      swCtx.fillRect(0, 0, 11, 11);
    } else {
      swCtx.fillStyle = '#3d4450';
      swCtx.fillRect(0, 0, 11, 11);
      swCtx.strokeStyle = '#f85149';
      swCtx.lineWidth = 1.5;
      swCtx.beginPath();
      swCtx.moveTo(2, 2); swCtx.lineTo(9, 9);
      swCtx.moveTo(9, 2); swCtx.lineTo(2, 9);
      swCtx.stroke();
    }

    const label = b.type ? `${cap(b.type)} ${b.size}px` : `Eraser ${b.size}px`;
    btn.appendChild(sw);
    btn.appendChild(document.createTextNode(label));
    btn.addEventListener('click', () => selectBrush(i));
    el.appendChild(btn);
  });

  if (spriteReady) paintBrushSwatches();
}

export function selectBrush(i: number): void {
  document.getElementById(`brush-${state.brushIdx}`)?.classList.remove('active');
  state.brushIdx = i;
  document.getElementById(`brush-${i}`)?.classList.add('active');
  const b = BRUSHES[i];
  const el = document.getElementById('st-brush');
  if (el) el.textContent = b.type ? `Brush: ${cap(b.type)} ${b.size}px` : 'Brush: Eraser';
}

// ── Mode ──────────────────────────────────────────
export function setMode(m: EditorMode): void {
  state.mode = m;
  (['terrain', 'player-spawn', 'enemy-spawn'] as const).forEach(id =>
    document.getElementById(`mode-${id}`)?.classList.remove('active'),
  );
  document.getElementById(`mode-${m}`)?.classList.add('active');
}

// ── Grid toggle ───────────────────────────────────
export function toggleGrid(): void {
  state.showGrid = !state.showGrid;
  const el = document.getElementById('btn-grid');
  if (el) el.textContent = `Grid ${state.showGrid ? 'ON' : 'OFF'}`;
  render();
}

// ── Enemy list ────────────────────────────────────
export function buildEnemyRows(): void {
  const el = document.getElementById('enemy-list')!;
  el.innerHTML = '';

  for (let i = 0; i < 20; i++) {
    const row     = document.createElement('div');
    row.className = 'enemy-row';

    const num = document.createElement('div');
    num.className   = 'enemy-num';
    num.textContent = String(i + 1);

    const typeOpts: [string, string][] = [['basic','basic'],['fast','fast'],['medium','medium'],['heavy','heavy']];
    const aiOpts:   [string, string][] = [['classic','classic'],['hunter','hunter'],['ambush','ambush'],['attack_base','atk base']];
    const dropOpts: [string, string][] = [['','none'],['random','random'],['shield','shield'],['freeze','freeze'],
      ['upgrade','upgrade'],['life','life'],['wipeout','wipeout'],['defence','defence']];

    const idx = i;
    const mkSel = (opts: [string, string][], val: string, cb: (v: string) => void): HTMLSelectElement => {
      const s = document.createElement('select');
      s.innerHTML = opts.map(([v, l]) => `<option value="${v}"${v === val ? ' selected' : ''}>${l}</option>`).join('');
      s.addEventListener('change', () => cb(s.value));
      return s;
    };

    row.appendChild(num);
    row.appendChild(mkSel(typeOpts, state.enemyList[idx].type, v => { state.enemyList[idx].type = v; }));
    row.appendChild(mkSel(aiOpts,   state.enemyList[idx].ai,   v => { state.enemyList[idx].ai   = v; }));
    row.appendChild(mkSel(dropOpts, state.enemyList[idx].drop, v => { state.enemyList[idx].drop = v; }));
    el.appendChild(row);
  }
}

export function syncEnemyRows(): void {
  document.querySelectorAll('#enemy-list .enemy-row').forEach((row, i) => {
    const sels = row.querySelectorAll('select');
    (sels[0] as HTMLSelectElement).value = state.enemyList[i].type;
    (sels[1] as HTMLSelectElement).value = state.enemyList[i].ai;
    (sels[2] as HTMLSelectElement).value = state.enemyList[i].drop;
  });
}

// ── Spawn lists ───────────────────────────────────
export function refreshSpawnLists(): void {
  buildSpawnSection(
    'list-player-spawns',
    state.playerSpawns,
    'p',
    'P',
    (i) => removeSpawn('player', i),
  );
  buildSpawnSection(
    'list-enemy-spawns',
    state.enemySpawns,
    'e',
    'E',
    (i) => removeSpawn('enemy', i),
  );
}

function buildSpawnSection(
  elId: string,
  spawns: { x: number; y: number }[],
  badgeClass: string,
  prefix: string,
  onRemove: (i: number) => void,
): void {
  const el = document.getElementById(elId)!;
  el.innerHTML = '';
  spawns.forEach((s, i) => {
    const row        = document.createElement('div');
    row.className    = 'spawn-row';

    const badge      = document.createElement('span');
    badge.className  = `spawn-badge ${badgeClass}`;
    badge.textContent = `${prefix}${i + 1}`;

    const coord      = document.createElement('span');
    coord.className  = 'spawn-coord';
    coord.textContent = `${s.x}, ${s.y}`;

    const del        = document.createElement('button');
    del.className    = 'spawn-del';
    del.textContent  = '×';
    del.addEventListener('click', () => onRemove(i));

    row.appendChild(badge);
    row.appendChild(coord);
    row.appendChild(del);
    el.appendChild(row);
  });
}

function removeSpawn(kind: 'player' | 'enemy', i: number): void {
  if (kind === 'player') state.playerSpawns.splice(i, 1);
  else                   state.enemySpawns.splice(i, 1);
  refreshSpawnLists();
  pushHistory();
  render();
}

// ── Helpers ───────────────────────────────────────
function cap(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// ── Status bar ────────────────────────────────────
export function updateStatusCoords(fx: number, fy: number, col: number, row: number): void {
  const xy   = document.getElementById('st-xy');
  const cell = document.getElementById('st-cell');
  if (xy)   xy.textContent   = `x: ${fx}, y: ${fy}`;
  if (cell) cell.textContent = `tile: ${col}, ${row}`;
}

export function updateZoomStatus(): void {
  const el = document.getElementById('st-zoom');
  if (el) el.textContent = `Zoom: ${Math.round(state.zoom * 100)}%`;
}

// ── Wire toolbar buttons ──────────────────────────
export function wireModeButtons(): void {
  document.getElementById('mode-terrain')?.addEventListener('click', () => setMode('terrain'));
  document.getElementById('mode-player-spawn')?.addEventListener('click', () => setMode('player-spawn'));
  document.getElementById('mode-enemy-spawn')?.addEventListener('click', () => setMode('enemy-spawn'));
}

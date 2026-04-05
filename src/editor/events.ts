import { TS, TL, FIELD, BRUSHES } from './constants';
import { paint } from './grid';
import { stepUndo, stepRedo, pushHistory } from './history';
import { render, resizeCanvas, centerView, c2w, w2c } from './renderer';
import { state } from './state';
import { selectBrush, setMode, toggleGrid, refreshSpawnLists, updateStatusCoords, updateZoomStatus } from './ui';
import { newMap, saveMap, openFile, onFileSelected, testMap, openMapBrowser } from './io';
import type { SpawnPoint } from './types';

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

function inField(wx: number, wy: number): boolean {
  return wx >= 0 && wx < FIELD && wy >= 0 && wy < FIELD;
}

function snapToTL(wx: number, wy: number): SpawnPoint {
  return {
    x: clamp(Math.floor(wx / TL) * TL, 0, FIELD - TL),
    y: clamp(Math.floor(wy / TL) * TL, 0, FIELD - TL),
  };
}

function nearest(list: SpawnPoint[], pos: SpawnPoint): number {
  let bestI = 0, bestD = Infinity;
  list.forEach((s, i) => {
    const d = Math.hypot(s.x - pos.x, s.y - pos.y);
    if (d < bestD) { bestD = d; bestI = i; }
  });
  return bestI;
}

// ── Mouse ─────────────────────────────────────────
export function bindViewport(viewport: HTMLElement): void {
  viewport.addEventListener('contextmenu', e => e.preventDefault());

  viewport.addEventListener('mousedown', (e: MouseEvent) => {
    e.preventDefault();
    const rect  = viewport.getBoundingClientRect();
    const world = c2w(e.clientX - rect.left, e.clientY - rect.top);

    if (state.spaceDown || e.button === 1) {
      state.isPanning    = true;
      state.panAnchorX   = e.clientX;
      state.panAnchorY   = e.clientY;
      state.panAnchorPX  = state.panX;
      state.panAnchorPY  = state.panY;
      return;
    }

    if (state.mode === 'terrain') {
      if (!inField(world.x, world.y)) return;
      state.isDrawing = true;
      state.isErasing = e.button === 2;
      pushHistory();
      paint(world.x, world.y, state.isErasing);
      render();

    } else if (state.mode === 'player-spawn' && e.button === 0 && inField(world.x, world.y)) {
      const snapped = snapToTL(world.x, world.y);
      if (state.playerSpawns.length < 2) state.playerSpawns.push(snapped);
      else state.playerSpawns[nearest(state.playerSpawns, snapped)] = snapped;
      refreshSpawnLists();
      pushHistory();
      render();

    } else if (state.mode === 'enemy-spawn' && e.button === 0 && inField(world.x, world.y)) {
      const snapped = snapToTL(world.x, world.y);
      if (state.enemySpawns.length < 6) state.enemySpawns.push(snapped);
      else state.enemySpawns[nearest(state.enemySpawns, snapped)] = snapped;
      refreshSpawnLists();
      pushHistory();
      render();
    }
  });

  viewport.addEventListener('mousemove', (e: MouseEvent) => {
    const rect  = viewport.getBoundingClientRect();
    const cx    = e.clientX - rect.left;
    const cy    = e.clientY - rect.top;
    const world = c2w(cx, cy);
    state.mouseWX = world.x;
    state.mouseWY = world.y;

    if (state.isPanning) {
      state.panX = state.panAnchorPX + (e.clientX - state.panAnchorX);
      state.panY = state.panAnchorPY + (e.clientY - state.panAnchorY);
      render();
      return;
    }

    if (state.isDrawing && state.mode === 'terrain' && inField(world.x, world.y)) {
      paint(world.x, world.y, state.isErasing);
    }

    const fx  = clamp(Math.round(world.x), 0, FIELD - 1);
    const fy  = clamp(Math.round(world.y), 0, FIELD - 1);
    updateStatusCoords(fx, fy, Math.floor(fx / TS), Math.floor(fy / TS));
    render();
  });

  const stopDrag = () => {
    state.isPanning = false;
    state.isDrawing = false;
    state.isErasing = false;
  };
  viewport.addEventListener('mouseup',    stopDrag);
  viewport.addEventListener('mouseleave', stopDrag);

  viewport.addEventListener('wheel', (e: WheelEvent) => {
    e.preventDefault();
    const rect   = viewport.getBoundingClientRect();
    const cx     = e.clientX - rect.left;
    const cy     = e.clientY - rect.top;
    const before = c2w(cx, cy);

    state.zoom = clamp(state.zoom * (e.deltaY < 0 ? 1.15 : 1 / 1.15), 0.2, 5);

    const after = w2c(before.x, before.y);
    state.panX += cx - after.x;
    state.panY += cy - after.y;

    updateZoomStatus();
    render();
  }, { passive: false });
}

// ── Keyboard ──────────────────────────────────────
export function bindKeyboard(): void {
  document.addEventListener('keydown', (e: KeyboardEvent) => {
    const tag = (e.target as HTMLElement).tagName;
    if (tag === 'INPUT' || tag === 'SELECT') return;

    if (e.key === ' ')             { state.spaceDown = true; e.preventDefault(); return; }
    if (e.ctrlKey && e.key === 'z') { stepUndo(); refreshSpawnLists(); render(); return; }
    if (e.ctrlKey && (e.key === 'y' || e.key === 'Z')) { stepRedo(); refreshSpawnLists(); render(); return; }
    if (e.ctrlKey && e.key === 's') { e.preventDefault(); saveMap(); return; }
    if (e.ctrlKey && e.key === 'o') { e.preventDefault(); openFile(); return; }

    const key = e.key.toLowerCase();
    switch (key) {
      case 'b': cycleBrushGroup(0, 3); break;
      case 's': cycleBrushGroup(3, 2); break;
      case 'j': cycleBrushGroup(5, 2); break;
      case 'w': cycleBrushGroup(7, 2); break;
      case 'i': cycleBrushGroup(9, 2); break;
      case 'e': selectBrush(BRUSHES.length - 1); break;
      case 'g': toggleGrid(); break;
      case 'f': centerView(); render(); break;
      case '[': selectBrush(Math.max(0, state.brushIdx - 1)); break;
      case ']': selectBrush(Math.min(BRUSHES.length - 1, state.brushIdx + 1)); break;
      case '-': case '_': state.zoom = clamp(state.zoom / 1.2, 0.2, 5); updateZoomStatus(); render(); break;
      case '=': case '+': state.zoom = clamp(state.zoom * 1.2, 0.2, 5); updateZoomStatus(); render(); break;
      case 'delete':
        if (confirm('Clear all terrain?')) { state.grid.fill(0); pushHistory(); render(); }
        break;
    }
  });

  document.addEventListener('keyup', (e: KeyboardEvent) => {
    if (e.key === ' ') state.spaceDown = false;
  });
}

function cycleBrushGroup(start: number, count: number): void {
  if (state.brushIdx >= start && state.brushIdx < start + count) {
    selectBrush(start + (state.brushIdx - start + 1) % count);
  } else {
    selectBrush(start);
  }
}

// ── Toolbar buttons ───────────────────────────────
export function bindToolbar(): void {
  document.getElementById('btn-new')?.addEventListener('click', newMap);
  document.getElementById('btn-load')?.addEventListener('click', openFile);
  document.getElementById('btn-browse')?.addEventListener('click', openMapBrowser);
  document.getElementById('btn-save')?.addEventListener('click', saveMap);
  document.getElementById('btn-test')?.addEventListener('click', testMap);
  document.getElementById('btn-undo')?.addEventListener('click', () => { stepUndo(); refreshSpawnLists(); render(); });
  document.getElementById('btn-redo')?.addEventListener('click', () => { stepRedo(); refreshSpawnLists(); render(); });
  document.getElementById('btn-grid')?.addEventListener('click', toggleGrid);
  document.getElementById('btn-center')?.addEventListener('click', () => { centerView(); render(); });

  document.getElementById('mode-terrain')?.addEventListener('click', () => setMode('terrain'));
  document.getElementById('mode-player-spawn')?.addEventListener('click', () => setMode('player-spawn'));
  document.getElementById('mode-enemy-spawn')?.addEventListener('click', () => setMode('enemy-spawn'));

  document.getElementById('file-input')?.addEventListener('change', onFileSelected);
}

// ── Window resize ─────────────────────────────────
export function bindResize(): void {
  window.addEventListener('resize', () => { resizeCanvas(); render(); });
}

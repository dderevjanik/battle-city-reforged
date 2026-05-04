import { TS, TL, MIN_FIELD_TILES, MAX_FIELD_TILES, BRUSHES, T2I } from './constants';
import { paint, paintRect, paintLine, floodFill, cellAt, pickBrushAtCell } from './grid';
import { stepUndo, stepRedo, pushHistory } from './history';
import { render, resizeCanvas, centerView, c2w, w2c } from './renderer';
import { state, resizeField } from './state';
import { selectBrush, setMode, selectTool, toggleGrid, refreshSpawnLists, updateStatusCoords, updateZoomStatus, addEnemy, syncEnemyRows } from './ui';
import { newMap, saveMap, openFile, onFileSelected, testMap, openMapBrowser, shareMap } from './io';
import type { PaintTool, SpawnPoint, ViewMode } from './types';

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

function inField(wx: number, wy: number): boolean {
  return wx >= 0 && wx < state.fieldWidth && wy >= 0 && wy < state.fieldHeight;
}

const DRAG_THRESHOLD_PX = 8;

function snapToTL(wx: number, wy: number): SpawnPoint {
  return {
    x: clamp(Math.floor(wx / TL) * TL, 0, state.fieldWidth  - TL),
    y: clamp(Math.floor(wy / TL) * TL, 0, state.fieldHeight - TL),
  };
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

      // Eyedropper: Alt + left-click adopts terrain under cursor as the active brush.
      if (e.altKey && e.button === 0) {
        const { col, row } = cellAt(world.x, world.y);
        selectBrush(pickBrushAtCell(col, row));
        render();
        return;
      }

      const isErase = e.button === 2;
      const tool: PaintTool = isErase ? 'free' : state.paintTool;

      if (tool === 'fill') {
        const { col, row } = cellAt(world.x, world.y);
        const b = BRUSHES[state.brushIdx];
        const fillIdx = b.type ? (T2I[b.type] ?? 0) : 0;
        const result = floodFill(col, row, fillIdx);
        for (const [c, r] of result.matched) {
          state.grid[r * state.gw + c] = fillIdx;
        }
        pushHistory();
        render();
        return;
      }

      state.isDrawing = true;
      state.isErasing = isErase;
      state.paintAnchorCX = e.clientX;
      state.paintAnchorCY = e.clientY;
      state.paintHasDragged = false;

      if (tool === 'rect' || tool === 'line') {
        const { col, row } = cellAt(world.x, world.y);
        state.dragStartCol = col;
        state.dragStartRow = row;
        render();
        return;
      }

      paint(world.x, world.y, state.isErasing);
      render();

    } else if (state.mode === 'player-spawn' && e.button === 0 && inField(world.x, world.y)) {
      const snapped = snapToTL(world.x, world.y);
      const existIdx = state.playerSpawns.findIndex(s => s.x === snapped.x && s.y === snapped.y);
      if (existIdx !== -1) state.playerSpawns.splice(existIdx, 1);
      else if (state.playerSpawns.length < 4) state.playerSpawns.push(snapped);
      refreshSpawnLists();
      pushHistory();
      render();

    } else if (state.mode === 'enemy-spawn' && e.button === 0 && inField(world.x, world.y)) {
      const snapped = snapToTL(world.x, world.y);
      const existIdx = state.enemySpawns.findIndex(s => s.x === snapped.x && s.y === snapped.y);
      if (existIdx !== -1) state.enemySpawns.splice(existIdx, 1);
      else state.enemySpawns.push(snapped);
      refreshSpawnLists();
      pushHistory();
      render();

    } else if (state.mode === 'base-spawn' && e.button === 0 && inField(world.x, world.y)) {
      const snapped = snapToTL(world.x, world.y);
      const existIdx = state.basePositions.findIndex(s => s.x === snapped.x && s.y === snapped.y);
      if (existIdx !== -1) state.basePositions.splice(existIdx, 1);
      else state.basePositions.push(snapped);
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

    viewport.style.cursor = (e.altKey && state.mode === 'terrain' && inField(world.x, world.y))
      ? 'crosshair'
      : '';

    if (state.isPanning) {
      state.panX = state.panAnchorPX + (e.clientX - state.panAnchorX);
      state.panY = state.panAnchorPY + (e.clientY - state.panAnchorY);
      render();
      return;
    }

    if (state.isDrawing && state.mode === 'terrain') {
      const tool: PaintTool = state.isErasing ? 'free' : state.paintTool;
      if (tool === 'rect' || tool === 'line') {
        // Preview is rendered via render() below; nothing to commit yet.
      } else if (inField(world.x, world.y)) {
        if (!state.paintHasDragged) {
          const dx = e.clientX - state.paintAnchorCX;
          const dy = e.clientY - state.paintAnchorCY;
          if (dx * dx + dy * dy >= DRAG_THRESHOLD_PX * DRAG_THRESHOLD_PX) {
            state.paintHasDragged = true;
          }
        }
        if (state.paintHasDragged) {
          paint(world.x, world.y, state.isErasing);
        }
      }
    }

    const fx  = clamp(Math.round(world.x), 0, state.fieldWidth  - 1);
    const fy  = clamp(Math.round(world.y), 0, state.fieldHeight - 1);
    updateStatusCoords(fx, fy, Math.floor(fx / TS), Math.floor(fy / TS));
    render();
  });

  const commitShapeIfNeeded = (e: MouseEvent | null): void => {
    if (!state.isDrawing || state.mode !== 'terrain' || state.isErasing) return;
    const tool = state.paintTool;
    if (tool !== 'rect' && tool !== 'line') return;

    let endCol = state.dragStartCol;
    let endRow = state.dragStartRow;
    if (e) {
      const rect = viewport.getBoundingClientRect();
      const world = c2w(e.clientX - rect.left, e.clientY - rect.top);
      const c = cellAt(world.x, world.y);
      endCol = c.col;
      endRow = c.row;
    }

    const b = BRUSHES[state.brushIdx];
    const idx = b.type ? (T2I[b.type] ?? 0) : 0;
    const step = Math.max(1, Math.floor(b.size / TS));
    if (tool === 'rect') {
      paintRect(state.dragStartCol, state.dragStartRow, endCol, endRow, idx, step);
    } else {
      paintLine(state.dragStartCol, state.dragStartRow, endCol, endRow, idx, step);
    }
  };

  const stopDrag = (e?: MouseEvent) => {
    const wasDrawingTerrain = state.isDrawing && state.mode === 'terrain';
    commitShapeIfNeeded(e ?? null);
    state.isPanning = false;
    state.isDrawing = false;
    state.isErasing = false;
    state.lastPaintCol = -1;
    state.lastPaintRow = -1;
    if (wasDrawingTerrain) pushHistory();
    render();
  };
  viewport.addEventListener('mouseup',    (e) => stopDrag(e));
  viewport.addEventListener('mouseleave', (e) => stopDrag(e));

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
    if (e.ctrlKey && e.key === 'z') { stepUndo(); refreshSpawnLists(); syncEnemyRows(); render(); return; }
    if (e.ctrlKey && (e.key === 'y' || e.key === 'Z')) { stepRedo(); refreshSpawnLists(); syncEnemyRows(); render(); return; }
    if (e.ctrlKey && e.key === 's') { e.preventDefault(); saveMap(); return; }
    if (e.ctrlKey && e.key === 'o') { e.preventDefault(); openFile(); return; }

    if (e.key.startsWith('Arrow')) {
      const step = e.shiftKey ? 128 : 32;
      switch (e.key) {
        case 'ArrowLeft':  state.panX += step; break;
        case 'ArrowRight': state.panX -= step; break;
        case 'ArrowUp':    state.panY += step; break;
        case 'ArrowDown':  state.panY -= step; break;
      }
      e.preventDefault();
      render();
      return;
    }

    const key = e.key.toLowerCase();
    switch (key) {
      case '1': selectTool('free'); return;
      case '2': selectTool('rect'); return;
      case '3': selectTool('line'); return;
      case '4': selectTool('fill'); return;
    }
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
  document.getElementById('btn-save')?.addEventListener('click', saveMap);
  document.getElementById('btn-test')?.addEventListener('click', testMap);
  document.getElementById('btn-share')?.addEventListener('click', () => { void shareMap(); });
  document.getElementById('btn-undo')?.addEventListener('click', () => { stepUndo(); refreshSpawnLists(); syncEnemyRows(); render(); });
  document.getElementById('btn-redo')?.addEventListener('click', () => { stepRedo(); refreshSpawnLists(); syncEnemyRows(); render(); });
  document.getElementById('btn-grid')?.addEventListener('click', toggleGrid);
  document.getElementById('btn-center')?.addEventListener('click', () => { centerView(); render(); });

  // Load dropdown menu
  const loadMenuBtn = document.getElementById('btn-load-menu');
  const loadDropdown = document.getElementById('load-dropdown');
  loadMenuBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    const shown = loadDropdown!.style.display !== 'none';
    loadDropdown!.style.display = shown ? 'none' : 'block';
  });
  document.getElementById('btn-load')?.addEventListener('click', () => {
    loadDropdown!.style.display = 'none';
    openFile();
  });
  document.getElementById('btn-browse')?.addEventListener('click', () => {
    loadDropdown!.style.display = 'none';
    openMapBrowser();
  });
  document.addEventListener('click', () => {
    if (loadDropdown) loadDropdown.style.display = 'none';
  });

  document.getElementById('mode-terrain')?.addEventListener('click', () => setMode('terrain'));
  document.getElementById('mode-player-spawn')?.addEventListener('click', () => setMode('player-spawn'));
  document.getElementById('mode-enemy-spawn')?.addEventListener('click', () => setMode('enemy-spawn'));
  document.getElementById('mode-base-spawn')?.addEventListener('click', () => setMode('base-spawn'));

  // Enemy list add
  document.getElementById('btn-enemy-add')?.addEventListener('click', addEnemy);

  document.getElementById('file-input')?.addEventListener('change', onFileSelected);

  document.getElementById('btn-apply-size')?.addEventListener('click', () => {
    const wEl = document.getElementById('inp-tiles-w') as HTMLInputElement | null;
    const hEl = document.getElementById('inp-tiles-h') as HTMLInputElement | null;
    const tilesW = clamp(parseInt(wEl?.value ?? '') || state.fieldWidth  / TL, MIN_FIELD_TILES, MAX_FIELD_TILES);
    const tilesH = clamp(parseInt(hEl?.value ?? '') || state.fieldHeight / TL, MIN_FIELD_TILES, MAX_FIELD_TILES);
    if (wEl) wEl.value = String(tilesW);
    if (hEl) hEl.value = String(tilesH);
    const newW = tilesW * TL;
    const newH = tilesH * TL;
    if (newW === state.fieldWidth && newH === state.fieldHeight) return;
    resizeField(newW, newH);
    refreshSpawnLists();
    pushHistory();
    centerView();
    render();
  });

  const vmSel = document.getElementById('inp-viewmode') as HTMLSelectElement | null;
  vmSel?.addEventListener('change', () => {
    const v = vmSel.value as ViewMode;
    if (v === 'fit' || v === 'scroll') {
      state.viewMode = v;
      pushHistory();
    }
  });
}

// ── Window resize ─────────────────────────────────
export function bindResize(): void {
  window.addEventListener('resize', () => { resizeCanvas(); render(); });
}

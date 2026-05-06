import { PLAYTEST_STORAGE_KEY } from '../core/render/BridgeScene';
import { encodeMapToHash } from '../share/shareUrl';
import { COLORS, T2I, TL, TS, defaultPlayerSpawns, defaultEnemySpawns, defaultBases } from './constants';
import { gridToRegions, regionsToGrid } from './grid';
import { pushHistory } from './history';
import { render } from './renderer';
import { state, resizeField } from './state';
import { buildEnemyRows, refreshSpawnLists, syncEnemyRows } from './ui';
import type { MapDto, SpawnPoint, ViewMode } from './types';

function getInputValue(id: string): string {
  return (document.getElementById(id) as HTMLInputElement | null)?.value ?? '';
}

function setInputValue(id: string, v: string | number): void {
  const el = document.getElementById(id) as HTMLInputElement | null;
  if (el) el.value = String(v);
}

export function buildMapDto(): MapDto {
  const title = getInputValue('inp-title').trim();
  const viewMode = (getInputValue('inp-viewmode') || state.viewMode) as ViewMode;
  return {
    tileset: 'classic',
    ...(title ? { title } : {}),
    width:    state.fieldWidth,
    height:   state.fieldHeight,
    ...(viewMode && viewMode !== 'fit' ? { viewMode } : {}),
    spawn: {
      enemy: {
        spawnDelay:    parseFloat(getInputValue('inp-delay')) || 3,
        maxAliveCount: parseInt(getInputValue('inp-alive'))   || 4,
        list: state.enemyList.map(e => {
          const entry: { type: string; ai: string; drop?: string } = { ai: e.ai, type: e.type };
          if (e.drop) entry.drop = e.drop;
          return entry;
        }),
        locations: state.enemySpawns.map(s => ({ x: s.x, y: s.y })),
      },
      player: {
        locations: state.playerSpawns.map(s => ({ x: s.x, y: s.y })),
      },
      bases: state.basePositions.map(s => ({ x: s.x, y: s.y })),
    },
    terrain: {
      regions: gridToRegions(),
    },
  };
}

export function loadDto(dto: MapDto): void {
  if (dto.width && dto.height) {
    resizeField(dto.width, dto.height);
  }
  state.viewMode = dto.viewMode ?? 'fit';

  regionsToGrid(dto.terrain?.regions ?? []);

  const w = state.fieldWidth, h = state.fieldHeight;
  state.playerSpawns = ((dto.spawn?.player?.locations ?? defaultPlayerSpawns(w, h)) as SpawnPoint[]).map(s => ({ x: s.x, y: s.y }));
  state.enemySpawns  = ((dto.spawn?.enemy?.locations  ?? defaultEnemySpawns(w, h))  as SpawnPoint[]).map(s => ({ x: s.x, y: s.y }));
  state.basePositions = dto.spawn?.bases?.map(s => ({ x: s.x, y: s.y }))
    ?? (dto.spawn?.base ? [{ x: dto.spawn.base.x, y: dto.spawn.base.y }] : defaultBases(w, h));

  setInputValue('inp-title', dto.title ?? '');
  setInputValue('inp-tiles-w', state.fieldWidth  / 64);
  setInputValue('inp-tiles-h', state.fieldHeight / 64);
  setInputValue('inp-viewmode', state.viewMode);

  if (dto.spawn?.enemy?.spawnDelay    !== undefined) setInputValue('inp-delay', dto.spawn.enemy.spawnDelay);
  if (dto.spawn?.enemy?.maxAliveCount !== undefined) setInputValue('inp-alive', dto.spawn.enemy.maxAliveCount);

  if (dto.spawn?.enemy?.list) {
    dto.spawn.enemy.list.forEach((e, i) => {
      if (i < 20) state.enemyList[i] = { type: e.type ?? 'basic', ai: e.ai ?? 'classic', drop: e.drop ?? '' };
    });
    syncEnemyRows();
  }

  refreshSpawnLists();
  pushHistory();
  render();
}

export function paintBaseDefense(): void {
  const BRICK = T2I['brick'];
  const fill = (col: number, row: number, cols: number, rows: number): void => {
    const { gw, gh } = state;
    for (let r = row; r < row + rows; r++) {
      for (let c = col; c < col + cols; c++) {
        if (c >= 0 && c < gw && r >= 0 && r < gh) state.grid[r * gw + c] = BRICK;
      }
    }
  };
  for (const base of state.basePositions) {
    const heartCol = base.x / TS;
    const heartRow = base.y / TS;
    fill(heartCol - 2, heartRow - 2, 8, 2); // top wall
    fill(heartCol - 2, heartRow,     2, 4); // left wing
    fill(heartCol + 4, heartRow,     2, 4); // right wing
  }
}

export function newMap(): void {
  if (!confirm('Clear current map and start fresh?')) return;

  // Honor the size/viewMode inputs if the user changed them.
  const tilesW = parseInt(getInputValue('inp-tiles-w')) || (state.fieldWidth  / 64);
  const tilesH = parseInt(getInputValue('inp-tiles-h')) || (state.fieldHeight / 64);
  const newW = Math.max(1, tilesW) * 64;
  const newH = Math.max(1, tilesH) * 64;
  if (newW !== state.fieldWidth || newH !== state.fieldHeight) {
    resizeField(newW, newH);
  }
  const vm = getInputValue('inp-viewmode') as ViewMode;
  if (vm === 'fit' || vm === 'scroll') state.viewMode = vm;

  state.grid.fill(0);
  state.playerSpawns = defaultPlayerSpawns(state.fieldWidth, state.fieldHeight);
  state.enemySpawns  = defaultEnemySpawns(state.fieldWidth, state.fieldHeight);
  state.basePositions = defaultBases(state.fieldWidth, state.fieldHeight);
  paintBaseDefense();
  state.enemyList    = Array.from({ length: 20 }, () => ({ type: 'basic', ai: 'classic', drop: '' }));
  setInputValue('inp-title', 'CUSTOM STAGE');
  setInputValue('inp-delay', 3);
  setInputValue('inp-alive', 4);
  refreshSpawnLists();
  buildEnemyRows();
  pushHistory();
  render();
}

function validateMap(dto: MapDto): string[] {
  const issues: string[] = [];
  if (dto.spawn.player.locations.length === 0) {
    issues.push('Map has no player spawn points.');
  }
  if (dto.spawn.enemy.locations.length === 0) {
    issues.push('Map has no enemy spawn points.');
  }
  return issues;
}

export function testMap(): void {
  const dto = buildMapDto();
  const issues = validateMap(dto);
  if (issues.length > 0) {
    alert(`Cannot test map:\n\n${issues.join('\n')}`);
    return;
  }
  localStorage.setItem(PLAYTEST_STORAGE_KEY, JSON.stringify(dto));
  window.open('index.html', '_blank');
}

export async function shareMap(): Promise<void> {
  const dto = buildMapDto();
  const issues = validateMap(dto);
  if (issues.length > 0) {
    if (!confirm(`Map has issues:\n\n${issues.join('\n')}\n\nShare anyway?`)) {
      return;
    }
  }
  const fragment = await encodeMapToHash(dto);
  const url = new URL('index.html', window.location.href).href + '#m=' + fragment;
  let copied = false;
  try {
    await navigator.clipboard.writeText(url);
    copied = true;
  } catch {
    copied = false;
  }
  const header = copied ? 'Link copied to clipboard:' : 'Copy this link:';
  window.prompt(header, url);
}

export function saveMap(): void {
  const dto = buildMapDto();
  const issues = validateMap(dto);
  if (issues.length > 0) {
    if (!confirm(`Map has issues:\n\n${issues.join('\n')}\n\nSave anyway?`)) {
      return;
    }
  }
  const json = JSON.stringify(dto, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const a    = document.createElement('a');
  a.href     = URL.createObjectURL(blob);
  a.download = 'map.json';
  a.click();
  URL.revokeObjectURL(a.href);
}

export function openFile(): void {
  document.getElementById('file-input')?.dispatchEvent(new MouseEvent('click'));
}

export function onFileSelected(event: Event): void {
  const input = event.target as HTMLInputElement;
  const file  = input.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      loadDto(JSON.parse(e.target?.result as string) as MapDto);
    } catch (err) {
      alert(`Invalid JSON: ${(err as Error).message}`);
    }
  };
  reader.readAsText(file);
  input.value = '';
}

interface MapManifestEntry { label: string; file: string; }
interface MapManifestGroup { name: string; maps: MapManifestEntry[]; }
interface MapManifest      { groups: MapManifestGroup[]; }

export async function loadMapFromUrl(url: string): Promise<void> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  loadDto(await res.json() as MapDto);
}

/**
 * Render a top-down preview of a map onto the given canvas. Used for thumbnails
 * in the map browser. Draws terrain regions, then base / player / enemy markers.
 */
export function renderMapThumbnail(canvas: HTMLCanvasElement, dto: MapDto): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const cw = canvas.width;
  const ch = canvas.height;
  const fieldW = dto.width  || 832;
  const fieldH = dto.height || 832;
  const scale = Math.min(cw / fieldW, ch / fieldH);
  const ox = (cw - fieldW * scale) / 2;
  const oy = (ch - fieldH * scale) / 2;

  ctx.fillStyle = '#0d1117';
  ctx.fillRect(0, 0, cw, ch);
  ctx.fillStyle = '#131f11';
  ctx.fillRect(ox, oy, fieldW * scale, fieldH * scale);

  for (const r of dto.terrain?.regions ?? []) {
    const color = COLORS[r.type];
    if (!color) continue;
    ctx.fillStyle = color;
    ctx.fillRect(ox + r.x * scale, oy + r.y * scale, r.width * scale, r.height * scale);
  }

  const tankPx = TL * scale;
  const bases = dto.spawn?.bases ?? (dto.spawn?.base ? [dto.spawn.base] : []);
  for (const b of bases) {
    ctx.fillStyle = '#e3b341';
    ctx.fillRect(ox + b.x * scale, oy + b.y * scale, tankPx, tankPx);
  }
  for (const p of dto.spawn?.player?.locations ?? []) {
    ctx.fillStyle = '#1f6feb';
    ctx.fillRect(ox + p.x * scale, oy + p.y * scale, tankPx, tankPx);
  }
  for (const e of dto.spawn?.enemy?.locations ?? []) {
    ctx.fillStyle = '#da3633';
    ctx.fillRect(ox + e.x * scale, oy + e.y * scale, tankPx, tankPx);
  }

  ctx.strokeStyle = '#3d4450';
  ctx.lineWidth = 1;
  ctx.strokeRect(ox + 0.5, oy + 0.5, fieldW * scale - 1, fieldH * scale - 1);
}

async function fetchMapDto(url: string): Promise<MapDto> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<MapDto>;
}

export function openMapBrowser(): void {
  const existing = document.getElementById('map-browser-overlay');
  if (existing) { existing.remove(); return; }

  const overlay = document.createElement('div');
  overlay.id = 'map-browser-overlay';
  Object.assign(overlay.style, {
    position: 'fixed', inset: '0', background: 'rgba(0,0,0,0.7)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: '1000',
  });

  const dialog = document.createElement('div');
  Object.assign(dialog.style, {
    background: '#161b22', border: '1px solid #30363d', padding: '16px',
    width: 'min(720px, 90vw)', maxHeight: '80vh', display: 'flex', flexDirection: 'column',
    fontFamily: "'Courier New', monospace", fontSize: '12px', color: '#e0e0e0',
  });

  const header = document.createElement('div');
  Object.assign(header.style, { display: 'flex', alignItems: 'center', marginBottom: '12px' });
  const title = document.createElement('span');
  title.textContent = 'OPEN MAP';
  Object.assign(title.style, { color: '#f85149', fontWeight: 'bold', fontSize: '13px', letterSpacing: '1px', flex: '1' });
  const closeBtn = document.createElement('button');
  closeBtn.textContent = '✕';
  Object.assign(closeBtn.style, { background: 'none', border: 'none', color: '#6e7681', cursor: 'pointer', fontSize: '14px' });
  closeBtn.onclick = () => overlay.remove();
  header.append(title, closeBtn);

  const body = document.createElement('div');
  Object.assign(body.style, { overflowY: 'auto', flex: '1' });
  body.textContent = 'Loading…';

  dialog.append(header, body);
  overlay.append(dialog);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
  document.body.append(overlay);

  fetch('data/maps/manifest.json')
    .then(r => r.json() as Promise<MapManifest>)
    .then(manifest => {
      body.textContent = '';
      for (const group of manifest.groups) {
        const groupLabel = document.createElement('div');
        groupLabel.textContent = group.name.toUpperCase();
        Object.assign(groupLabel.style, {
          color: '#6e7681', fontSize: '9px', letterSpacing: '1px',
          textTransform: 'uppercase', margin: '8px 0 4px',
        });
        body.append(groupLabel);

        const grid = document.createElement('div');
        Object.assign(grid.style, {
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, 104px)',
          gap: '8px',
        });

        for (const entry of group.maps) {
          const card = document.createElement('button');
          Object.assign(card.style, {
            background: '#0d1117', border: '1px solid #21262d', color: '#c9d1d9',
            padding: '6px', cursor: 'pointer', font: 'inherit', fontSize: '10px',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
          });
          card.onmouseenter = () => { card.style.borderColor = '#388bfd'; };
          card.onmouseleave = () => { card.style.borderColor = '#21262d'; };
          card.onclick = () => {
            overlay.remove();
            loadMapFromUrl(entry.file).catch(err => alert(`Failed to load map: ${(err as Error).message}`));
          };

          const thumb = document.createElement('canvas');
          thumb.width = 88;
          thumb.height = 88;
          Object.assign(thumb.style, {
            width: '88px', height: '88px',
            background: '#0d1117', imageRendering: 'pixelated',
          });
          const tctx = thumb.getContext('2d');
          if (tctx) {
            tctx.fillStyle = '#161b22';
            tctx.fillRect(0, 0, 88, 88);
          }

          const label = document.createElement('span');
          label.textContent = entry.label;
          Object.assign(label.style, {
            color: '#c9d1d9', textAlign: 'center', lineHeight: '1.2',
            wordBreak: 'break-word', maxWidth: '88px',
          });

          card.append(thumb, label);
          grid.append(card);

          fetchMapDto(entry.file)
            .then((dto) => renderMapThumbnail(thumb, dto))
            .catch(() => {
              if (!tctx) return;
              tctx.fillStyle = '#21262d';
              tctx.fillRect(0, 0, 88, 88);
              tctx.fillStyle = '#6e7681';
              tctx.font = "10px 'Courier New', monospace";
              tctx.textAlign = 'center';
              tctx.textBaseline = 'middle';
              tctx.fillText('?', 44, 44);
            });
        }
        body.append(grid);
      }
    })
    .catch(err => { body.textContent = `Error: ${(err as Error).message}`; });
}

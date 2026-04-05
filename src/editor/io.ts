import { PLAYTEST_STORAGE_KEY } from '../core/render/BridgeScene';
import { DEF_PLAYER, DEF_ENEMY } from './constants';
import { gridToRegions, regionsToGrid } from './grid';
import { pushHistory } from './history';
import { render } from './renderer';
import { state } from './state';
import { buildEnemyRows, refreshSpawnLists, syncEnemyRows } from './ui';
import type { MapDto, SpawnPoint } from './types';

function getInputValue(id: string): string {
  return (document.getElementById(id) as HTMLInputElement | null)?.value ?? '';
}

function setInputValue(id: string, v: string | number): void {
  const el = document.getElementById(id) as HTMLInputElement | null;
  if (el) el.value = String(v);
}

function getTilesetValue(): string {
  return (document.getElementById('sel-tileset') as HTMLSelectElement | null)?.value ?? 'classic';
}

function setTilesetValue(v: string): void {
  const el = document.getElementById('sel-tileset') as HTMLSelectElement | null;
  if (el) el.value = v;
}

export function buildMapDto(): MapDto {
  return {
    tileset: getTilesetValue(),
    width:   832,
    height:  832,
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
    },
    terrain: {
      regions: gridToRegions(),
    },
  };
}

export function loadDto(dto: MapDto): void {
  if (dto.tileset) setTilesetValue(dto.tileset);

  regionsToGrid(dto.terrain?.regions ?? []);

  state.playerSpawns = ((dto.spawn?.player?.locations ?? DEF_PLAYER) as SpawnPoint[]).map(s => ({ x: s.x, y: s.y }));
  state.enemySpawns  = ((dto.spawn?.enemy?.locations  ?? DEF_ENEMY)  as SpawnPoint[]).map(s => ({ x: s.x, y: s.y }));

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

export function newMap(): void {
  if (!confirm('Clear current map and start fresh?')) return;
  state.grid.fill(0);
  state.playerSpawns = DEF_PLAYER.map(s => ({ ...s }));
  state.enemySpawns  = DEF_ENEMY.map(s  => ({ ...s }));
  state.enemyList    = Array.from({ length: 20 }, () => ({ type: 'basic', ai: 'classic', drop: '' }));
  setInputValue('inp-delay', 3);
  setInputValue('inp-alive', 4);
  setTilesetValue('classic');
  refreshSpawnLists();
  buildEnemyRows();
  pushHistory();
  render();
}

export function testMap(): void {
  const json = JSON.stringify(buildMapDto());
  localStorage.setItem(PLAYTEST_STORAGE_KEY, json);
  window.open('index.html', '_blank');
}

export function saveMap(): void {
  const json = JSON.stringify(buildMapDto(), null, 2);
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

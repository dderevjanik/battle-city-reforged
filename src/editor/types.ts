export interface SpawnPoint {
  x: number;
  y: number;
}

export interface EnemyEntry {
  type: string;
  ai: string;
  drop: string;
}

export interface Brush {
  type: string | null;
  size: number;
}

export interface TerrainRegion {
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface MapDto {
  tileset: string;
  width: number;
  height: number;
  spawn: {
    enemy: {
      spawnDelay: number;
      maxAliveCount: number;
      list: Array<{ type: string; ai: string; drop?: string }>;
      locations: SpawnPoint[];
    };
    player: {
      locations: SpawnPoint[];
    };
  };
  terrain: {
    regions: TerrainRegion[];
  };
}

export type EditorMode = 'terrain' | 'player-spawn' | 'enemy-spawn';

export type SpriteRect = [number, number, number, number];

export interface HistorySnapshot {
  grid: Uint8Array;
  playerSpawns: SpawnPoint[];
  enemySpawns: SpawnPoint[];
}

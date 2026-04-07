import Ajv from 'ajv';

import { TankAiMode } from '../tank/TankAiMode';
import { TankDrop, TankKind } from '../tank/TankTypes';
import { TerrainType } from '../terrain/TerrainType';
import { TilesetId } from '../terrain/TilesetId';

import mapSchema from '../../data/map.schema.json';

export interface MapDtoSpawnEnemyListItem {
  type: TankKind;
  ai?: TankAiMode;
  drop?: TankDrop;
}

export interface MapDtoSpawnLocation {
  x: number;
  y: number;
}

export interface MapDtoSpawnEnemy {
  spawnDelay: number;
  maxAliveCount: number;
  list?: MapDtoSpawnEnemyListItem[];
  locations: MapDtoSpawnLocation[];
}

export interface MapDtoSpawnPlayer {
  locations: MapDtoSpawnLocation[];
}

export interface MapDtoSpawnBase {
  x: number;
  y: number;
}

export interface MapDtoSpawn {
  enemy: MapDtoSpawnEnemy;
  player: MapDtoSpawnPlayer;
  base?: MapDtoSpawnBase;
  bases?: MapDtoSpawnBase[];
}

export interface MapDtoTerrainRegion {
  type: TerrainType;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface MapDtoTerrain {
  regions?: MapDtoTerrainRegion[];
}

export interface MapDto {
  version?: number;
  tileset?: TilesetId;
  width: number;
  height: number;
  spawn: MapDtoSpawn;
  terrain?: MapDtoTerrain;
}

const ajv = new Ajv({ useDefaults: true });
export const validateMapDto = ajv.compile<MapDto>(mapSchema);

import Joi from 'joi';

import { TankAiMode } from '../tank/TankAiMode';
import { TankDrop, TankKind } from '../tank/TankTypes';
import { TerrainType } from '../terrain/TerrainType';
import { TilesetId } from '../terrain/TilesetId';
import { PowerupType } from '../powerup/PowerupType';

const VALID_DROP_VALUES: string[] = ['random', ...Object.values(PowerupType)];

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

const DEFAULT_VERSION = 1;

export const MapDtoSchema = Joi.object<MapDto>({
  version: Joi.number().default(DEFAULT_VERSION),
  tileset: Joi.string().valid(...Object.values(TilesetId)).default(TilesetId.Classic),
  width: Joi.number().integer().min(1).required(),
  height: Joi.number().integer().min(1).required(),
  spawn: Joi.object({
    enemy: Joi.object({
      spawnDelay: Joi.number().required(),
      maxAliveCount: Joi.number().integer().min(1).required(),
      locations: Joi.array()
        .items(
          Joi.object({
            x: Joi.number().required(),
            y: Joi.number().required(),
          }),
        )
        .min(1)
        .required(),
      list: Joi.array()
        .items(
          Joi.object({
            type: Joi.string()
              .valid(...Object.values(TankKind))
              .required(),
            ai: Joi.string().valid(...Object.values(TankAiMode)),
            drop: Joi.alternatives().try(
              Joi.string().valid(...VALID_DROP_VALUES),
              Joi.array().items(Joi.string().valid(...VALID_DROP_VALUES)).min(1),
            ),
          }),
        )
        .default([]),
    }).required(),
    player: Joi.object({
      locations: Joi.array()
        .items(
          Joi.object({
            x: Joi.number().required(),
            y: Joi.number().required(),
          }),
        )
        .min(1)
        .required(),
    }).required(),
    base: Joi.object({
      x: Joi.number().required(),
      y: Joi.number().required(),
    }).optional(),
    bases: Joi.array()
      .items(
        Joi.object({
          x: Joi.number().required(),
          y: Joi.number().required(),
        }),
      )
      .optional(),
  }).required(),
  terrain: Joi.object({
    regions: Joi.array()
      .items(
        Joi.object({
          type: Joi.string()
            .valid(...Object.values(TerrainType))
            .required(),
          x: Joi.number().required(),
          y: Joi.number().required(),
          width: Joi.number().required(),
          height: Joi.number().required(),
        }),
      )
      .default([]),
  }).default(),
});

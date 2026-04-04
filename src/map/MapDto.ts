import Joi from 'joi';

import { TankTier } from '../tank/TankTypes';
import { TerrainType } from '../terrain/TerrainType';
import { TilesetId } from '../terrain/TilesetId';

export interface MapDtoSpawnEnemyListItem {
  tier: TankTier;
  drop?: boolean;
}

export interface MapDtoSpawnLocation {
  x: number;
  y: number;
}

export interface MapDtoSpawnEnemy {
  list?: MapDtoSpawnEnemyListItem[];
  locations: MapDtoSpawnLocation[];
}

export interface MapDtoSpawnPlayer {
  locations: MapDtoSpawnLocation[];
}

export interface MapDtoSpawn {
  enemy: MapDtoSpawnEnemy;
  player: MapDtoSpawnPlayer;
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
  spawn: MapDtoSpawn;
  terrain?: MapDtoTerrain;
}

const DEFAULT_VERSION = 1;

export const MapDtoSchema = Joi.object<MapDto>({
  version: Joi.number().default(DEFAULT_VERSION),
  tileset: Joi.string().valid(...Object.values(TilesetId)).default(TilesetId.Classic),
  spawn: Joi.object({
    enemy: Joi.object({
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
            tier: Joi.string()
              .valid(...Object.values(TankTier))
              .required(),
            drop: Joi.boolean(),
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
